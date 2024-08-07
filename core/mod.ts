import { assert } from "@std/assert";
import {
  associateWith,
  deepMerge,
  distinct,
  mapNotNullish,
  mapValues,
} from "@std/collections";
import { parseRange, rangeIntersects } from "@std/semver";
import { get as getBump } from "./bumps.ts";
import * as Lock from "./locks.ts";
import * as Ref from "./refs.ts";
import { identify, parse, stringify } from "./specs.ts";
import type {
  Dependency as DependencyI,
  DependencyBump,
  DependencyKind,
  DependencyRef,
  DependencyState,
  DependencyUpdate,
  LockfileJson,
  Update as UpdateI,
  VersionBump,
} from "./types.ts";
import { get as getUpdate } from "./updates.ts";

/** The name of a dependency. @example "@molt/core" */
type Name = string;

/** The specifier of a dependency. @example "jsr:@molt/core" */
type Specifier = string;

/** The requirement of a dependency. @example "jsr:@molt/core@^0.1.0" */
type Req = string;

/** A stateful object shared by all dependencies. */
class Context {
  readonly specs: Specifier[];

  reqs: Record<Specifier, Req[]>;

  refs: Record<Req, DependencyRef[]>;
  states: Record<Req, DependencyState>;

  updates: Map<Req, DependencyUpdate> = new Map();
  bumps: Map<Req, DependencyBump> = new Map();

  constructor(
    reqs: Req[],
    refs: DependencyRef[],
    readonly locks: LockContext | undefined,
  ) {
    const groups = Object.groupBy(
      refs,
      (ref) => stringify(ref.dependency, "kind", "name"),
    );
    this.specs = Object.keys(groups);

    this.reqs = mapValues(
      groups,
      (refs) => distinct(refs!.map((ref) => identify(ref.dependency))),
    );
    this.refs = Object.groupBy(
      refs,
      (ref) => identify(ref.dependency),
    ) as Record<Req, DependencyRef[]>;

    this.states = associateWith(reqs, (req) => {
      const spec = parse(req);
      const lock = locks?.extracted.get(req);
      const locked = lock ? Lock.query(lock, spec) : undefined;
      return { ...spec, locked };
    });
  }
}

class LockContext {
  constructor(
    readonly source: string | URL,
    readonly reqs: Req[],
  ) {}

  readonly extracted: Map<Req, LockfileJson> = new Map();
  readonly created: Map<Req, LockfileJson> = new Map();

  get merged(): LockfileJson {
    return this.reqs.map((req) =>
      this.created.get(req) ?? this.extracted.get(req) ?? {} as LockfileJson
      // @ts-ignore allow passing concrete types to deepMerge
    ).reduce((prev, curr) => deepMerge(prev, curr), Lock.empty);
  }
}

class Dependency implements DependencyI {
  #ctx: Context;

  readonly kind: DependencyKind;
  readonly name: Name;

  constructor(
    context: Context,
    readonly specifier: Specifier,
  ) {
    this.#ctx = context;

    const req = this.#ctx.reqs[this.specifier][0];
    const { kind, name } = this.#ctx.states[req];

    this.kind = kind;
    this.name = name;
  }

  get refs(): string[] {
    return distinct(
      this.#ctx.reqs[this.specifier]
        .flatMap((req) => this.#ctx.refs[req])
        .map((ref) => ref.source.path)
        .map((it) => it instanceof URL ? it.pathname : it),
    );
  }

  async check(): Promise<Update | undefined> {
    const reqs = this.#ctx.reqs[this.specifier];

    const bumps = (await Promise.all(reqs.map(async (req) => {
      const dep = this.#ctx.states[req];

      const update = await getUpdate(dep);
      if (!update) return;
      this.#ctx.updates.set(req, update);

      const bump = getBump(this.#ctx.states[req], update);
      if (bump) {
        this.#ctx.bumps.set(req, bump);
        return bump;
      }
    }))).filter((bump) => bump !== undefined);

    if (bumps.length) {
      return new Update(this.#ctx, this, bumps);
    }
  }
}

export interface CollectOptions {
  config?: string | URL;
  lock?: string | URL;
  source?: (string | URL)[];
}

export async function collect(
  options: CollectOptions = {},
): Promise<Dependency[]> {
  const files = options.source ?? [];
  if (options.config) files.push(options.config);

  const refs = (await Promise.all(files.map(Ref.collect))).flat();
  const reqs = distinct(refs.map((ref) => identify(ref.dependency)));

  const locks = options.lock ? new LockContext(options.lock, reqs) : undefined;
  if (locks) {
    const lockfile = Lock.parse(await Deno.readTextFile(options.lock!));
    for (const req of reqs) {
      const lock = await Lock.extract(lockfile, parse(req));
      if (lock) locks.extracted.set(req, lock);
    }
  }
  const ctx = new Context(reqs, refs, locks);
  return ctx.specs.map((specifier) => new Dependency(ctx, specifier));
}

class Update implements UpdateI {
  #ctx: Context;

  constraint?: VersionBump;
  lock?: VersionBump;

  constructor(
    context: Context,
    readonly dep: Dependency,
    bumps: DependencyBump[],
  ) {
    const reqs = context.reqs[dep.specifier];
    const deps = reqs.map((req) => context.states[req]);

    const constraints = distinct(
      mapNotNullish(bumps, (bump) => bump.constraint),
    );
    assert(
      constraints.length <= 1,
      `multiple bump targets for ${dep.specifier}`,
    );
    const constraint = constraints.at(0);

    const locks = distinct(mapNotNullish(bumps, (bump) => bump.lock));
    assert(locks.length <= 1, `multiple lock targets for ${dep.specifier}`);
    const lock = locks.at(0);

    const constrainted = distinct(deps.map((dep) => dep.constraint))
      .filter((it) =>
        !constraint || !rangeIntersects(parseRange(constraint), parseRange(it))
      );
    const locked = distinct(mapNotNullish(deps, (dep) => dep.locked))
      .filter((it) =>
        !lock || !rangeIntersects(parseRange(lock), parseRange(it))
      );

    if (constraint) {
      this.constraint = { from: constrainted.join(", "), to: constraint };
    }
    if (lock) {
      this.lock = { from: locked.join(", "), to: lock };
    }
    this.#ctx = context;
  }

  async write(): Promise<void> {
    const reqs = this.#ctx.reqs[this.dep.specifier];
    for (const req of reqs) {
      const bump = this.#ctx.bumps.get(req);
      if (!bump) continue;

      if (bump.constraint) {
        const refs = this.#ctx.refs[req];
        for (const ref of refs) {
          await Ref.rewrite(ref, bump.constraint);
        }
      }
      if (this.#ctx.locks && bump.lock) {
        const dep = this.#ctx.states[req];
        const bumped = bump.constraint
          ? { ...dep, constraint: bump.constraint }
          : dep;
        const locked = this.#ctx.locks.extracted.get(req);
        if (locked) {
          const lock = await Lock.create(bumped, bump.lock, locked);
          this.#ctx.locks.created.set(req, lock);
        }
        await Deno.writeTextFile(
          this.#ctx.locks.source,
          Lock.format(this.#ctx.locks.merged),
        );
      }
    }
  }

  async commit(message?: string): Promise<string> {
    message ??= this.summary();

    const reqs = this.#ctx.reqs[this.dep.specifier];
    const refs = reqs.flatMap((req) => this.#ctx.refs[req]);

    await Ref.commit(refs, message, {
      lock: this.lock ? this.#ctx.locks!.source : undefined,
    }).output();

    return message;
  }

  summary(prefix?: string): string {
    const { from, to } = this.lock ?? this.constraint!;
    const head = prefix ? prefix.trimEnd() + " " : "";

    const full = head + `bump ${this.dep.name} from ${from} to ${to}`;
    if (full.length <= 50) return full;

    const long = head + `bump ${this.dep.name} to ${to}`;
    if (long.length <= 50) return long;

    return head + `bump ${this.dep.name}`;
  }
}
