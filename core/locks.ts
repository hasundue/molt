import { as, ensure, is } from "@core/unknownutil";
import { createGraph } from "@deno/graph";
import { filterValues, pick } from "@std/collections";
import * as SemVer from "@std/semver";
import {
  instantiate,
  type Lockfile,
  type LockfileJson,
  type NpmPackageInfo,
} from "./deno_lockfile/js/mod.ts";
import {
  type DependencySpec,
  identify,
  isDependencySpec,
  isRemote,
  parse as Spec,
  stringify,
} from "./specs.ts";
import { assertOk, checksum, MOLT_VERSION } from "./internal.ts";
import * as Update from "./updates.ts";

export type { LockfileJson };

const { parseFromJson } = await instantiate();

export const VERSION = "3";

export const empty: LockfileJson = {
  version: VERSION,
  remote: {},
};

/**
 * Create a new partial lock for the given dependency updated.
 *
 * @param dependency The dependency to create the lock for.
 * @param target The target version to update the dependency to.
 * @param original The original lockfile to create the partial lock from.
 *
 * @returns The `LockfileJson` object representing the partial lock.
 * @throws If the version of the original lockfile is not supported.
 */
export function create(
  dependency: DependencySpec,
  target: string,
  original: LockfileJson,
): Promise<LockfileJson> {
  if (original.version !== VERSION) {
    throw new Error(`Unsupported lockfile version: ${original.version}`);
  }
  return isRemote(dependency)
    ? createRemoteLock(dependency, original)
    : createPackageLock(dependency as DependencySpec<"jsr" | "npm">, target);
}

async function createRemoteLock(
  dep: DependencySpec<"http" | "https">,
  original: LockfileJson,
): Promise<LockfileJson> {
  const { kind, name, constraint, path } = dep;
  const reqs = Object.keys(original.remote).filter((req) =>
    [kind, name, path ?? ""].every((part) => req.includes(part))
  );
  const lockfile = parseFromJson("", empty);
  await Promise.all(reqs.map(async (outdated) => {
    const updated = stringify({ ...Spec(outdated), constraint });
    const graph = await createGraph(updated);
    await Promise.all(graph.modules.map(async ({ specifier }) => {
      const res = await fetch(specifier);
      assertOk(res);
      lockfile.insertRemote(specifier, await checksum(await res.arrayBuffer()));
    }));
  }));
  return lockfile.toJson();
}

async function createPackageLock(
  dep: DependencySpec<"jsr" | "npm">,
  target: string,
): Promise<LockfileJson> {
  const required = { ...dep, path: "" };
  const lockfile = parseFromJson("", {
    version: VERSION,
    remote: {},
    workspace: {
      dependencies: [
        stringify(required),
      ],
    },
  });
  await insertPackage(lockfile, required, target);
  return lockfile.toJson();
}

async function insertPackage(
  lock: Lockfile,
  required: DependencySpec<"jsr" | "npm">,
  target: string,
  seen: Set<string> = new Set(),
  insertSpecifier: boolean = true,
): Promise<void> {
  const req = identify(required);

  if (seen.has(req)) return;
  seen.add(req);

  const locked = { ...required, constraint: target };
  if (insertSpecifier) {
    lock.insertPackageSpecifier(req, stringify(locked));
  }
  const specifier = stringify(locked, "name", "constraint");
  if (required.kind === "jsr") {
    await insertJsrPackage(
      lock,
      specifier,
      locked as DependencySpec<"jsr">,
      seen,
    );
  } else {
    await insertNpmPackage(
      lock,
      specifier,
      locked as DependencySpec<"npm">,
      seen,
    );
  }
}

async function insertJsrPackage(
  lock: Lockfile,
  specifier: string,
  dependency: DependencySpec<"jsr">,
  seen: Set<string>,
): Promise<void> {
  lock.insertPackage(
    specifier,
    await getJsrPackageIntegrity(dependency),
  );
  const deps = await getJsrDependencies(dependency);
  lock.addPackageDeps(
    specifier,
    deps.map((dep) => stringify(dep, "kind", "name", "constraint")),
  );
  await Promise.all(deps.map((dep) => insertPackageDep(lock, dep, seen)));
}

async function insertNpmPackage(
  lock: Lockfile,
  specifier: string,
  dependency: DependencySpec<"npm">,
  seen: Set<string>,
): Promise<void> {
  const info = await getNpmPackageInfo(dependency);
  lock.insertNpmPackage(specifier, info);
  const deps = Object.values(info.dependencies).map((dep) =>
    Spec(`npm:${dep}`) as DependencySpec<"npm">
  );
  await Promise.all(
    deps.map((dep) => insertPackageDep(lock, dep, seen, false)),
  );
}

async function insertPackageDep(
  lock: Lockfile,
  dep: DependencySpec<"jsr" | "npm">,
  seen: Set<string>,
  insertSpecifier: boolean = true,
): Promise<void> {
  delete dep.path;
  const update = await Update.get(dep);
  if (!update?.constrainted) {
    throw new Error(`Failed to get constrainted version for ${dep.name}`);
  }
  const target = update.constrainted;
  await insertPackage(lock, dep, target, seen, insertSpecifier);
}

async function getJsrPackageIntegrity(
  dep: DependencySpec<"jsr">,
): Promise<string> {
  const { name, constraint: version } = dep;
  const res = await fetch(`https://jsr.io/${name}/${version}_meta.json`);
  return checksum(await res.arrayBuffer());
}

async function getNpmPackageInfo(
  dep: DependencySpec<"npm">,
): Promise<NpmPackageInfo> {
  const { name, constraint: version } = dep;
  const res = await fetch(
    `https://registry.npmjs.org/${name}/${version}`,
  );
  assertOk(res);
  const info = ensure(
    await res.json(),
    is.ObjectOf({
      dist: is.ObjectOf({
        integrity: is.String,
      }),
      dependencies: as.Optional(is.RecordOf(is.String, is.String)),
    }),
  );
  const dependencies: [name: string, version: string][] = [];
  await Promise.all(
    Object.entries(info.dependencies ?? {}).map(
      async ([name, version]) => {
        const spec = Spec(`npm:${name}@${version}`);
        const update = await Update.get(spec);
        if (!update?.constrainted) {
          throw new Error(`Failed to get constrainted version for ${dep.name}`);
        }
        dependencies.push([name, `${name}@${update.constrainted}`]);
      },
    ),
  );
  return {
    integrity: info.dist.integrity,
    dependencies: Object.fromEntries(dependencies),
  };
}

async function getJsrDependencies(
  dep: DependencySpec<"jsr">,
): Promise<DependencySpec<"jsr" | "npm">[]> {
  const { constraint: version } = dep;
  const [scope, name] = dep.name.slice(1).split("/");
  const res = await fetch(
    `https://api.jsr.io/scopes/${scope}/packages/${name}/versions/${version}/dependencies`,
    {
      headers: {
        "User-Agent": `molt/${MOLT_VERSION}; https://jsr.io/@molt`,
      },
    },
  );
  assertOk(res);
  return ensure(
    await res.json(),
    is.ArrayOf(isDependencySpec),
  ) as DependencySpec<"jsr" | "npm">[];
}

/**
 * Extract the partial lock for the given JSR or NPM package from a lockfile.
 *
 * @param lockfile The `Lockfile` object to extract the partial lock for the dependency from.
 * @param dependency The dependency to extract the partial lock for.
 * @returns The `LockfileJson` object representing the partial lock.
 * @throws If the lockfile version is not supported.
 *
 * @example
 * ```ts
 * const lockfile = await readLockFile("deno.lock");
 * extractPackage("jsr:@std/testing@^0.222.0", lockfile);
 * ```
 */
export async function extract(
  lockfile: LockfileJson,
  dependency: DependencySpec,
): Promise<LockfileJson | undefined> {
  if (lockfile.version !== VERSION) {
    throw new Error(`Unsupported lockfile version: ${lockfile.version}`);
  }
  return isRemote(dependency)
    ? await extractRemote(lockfile, dependency)
    : extractPackage(lockfile, dependency as DependencySpec<"jsr" | "npm">);
}

async function extractRemote(
  lock: LockfileJson,
  dep: DependencySpec<"http" | "https">,
): Promise<LockfileJson | undefined> {
  const reqs = Object.keys(lock.remote).filter((req) =>
    req.startsWith(stringify(dep))
  );
  const deps = (await Promise.all(reqs.map(async (req) => {
    const graph = await createGraph(req);
    return graph.modules.map((mod) => mod.specifier);
  }))).flat();
  if (!deps.length) return;
  return {
    version: VERSION,
    remote: filterValues(
      pick(lock.remote, deps),
      (hash) => hash !== undefined,
    ),
  };
}

function extractPackage(
  lock: LockfileJson,
  dep: DependencySpec<"jsr" | "npm">,
): LockfileJson | undefined {
  const name = stringify(dep, "kind", "name", "constraint");
  const lockfile = parseFromJson("", lock);
  lockfile.setWorkspaceConfig({ dependencies: [name] });
  const json = lockfile.toJson();
  if (!json.packages) return;
  json.remote = {};
  return json;
}

/**
 * Query the locked version of the given dependency from the lockfile.
 */
export function query(
  lockfile: LockfileJson,
  dependency: DependencySpec,
): string | undefined {
  if (isRemote(dependency)) {
    return dependency.constraint;
  }
  const req = identify(dependency);

  const id = lockfile.packages?.specifiers[req];
  if (!id) return;

  const { constraint } = Spec(id);
  const semver = SemVer.parse(constraint);
  const range = SemVer.parseRange(dependency.constraint);

  if (SemVer.satisfies(semver, range)) {
    return constraint;
  }
  // Failed to parse the locked version
}

/**
 * Stringify the given lockfile object.
 *
 * @param lockfile The `LockfileJson` object to stringify.
 * @returns The stringified lockfile content.
 */
export function format(
  lockfile: LockfileJson,
): string {
  const parsed = parseFromJson("", lockfile);
  return parsed.toString();
}

/**
 * Parse the given lockfile content.
 *
 * @param content The content of the lockfile to parse.
 * @returns The `LockfileJson` object representing the parsed lockfile.
 */
export function parse(
  content: string,
): LockfileJson {
  return parseFromJson("", content).toJson();
}
