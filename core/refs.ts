import { init, parseModule } from "@deno/graph";
import type { DependencyJson } from "@deno/graph/types";
import { toUrl } from "@molt/lib/path";
import { distinct, mapNotNullish } from "@std/collections";
import { detect, EOL, format } from "@std/fs/eol";
import { extname } from "@std/path";
import { type DependencySpec, parse, stringify, tryParse } from "./specs.ts";
import { parseImportMapJson, readImportMapJson } from "./maps.ts";

/** Type of the source of the dependency. */
export type DependencySourceKind = "esm" | "import_map";

/** Span of the dependency in the source code. */
export type RangeJson = NonNullable<DependencyJson["code"]>["span"];

/** Information about the source of the dependency. */
export type DependencySource<
  K extends DependencySourceKind = DependencySourceKind,
> = {
  /** The type of the source of the dependency. */
  kind: K;
  /** The path to the module that imports the dependency.
   * @example "mod.ts", "deno.jsonc" */
  path: string | URL;
} & DependencySourceLocator<K>;

/** Locator of the source of the dependency. */
export type DependencySourceLocator<
  K extends DependencySourceKind,
> = K extends "esm" ? { span: RangeJson }
  : K extends "import_map" ? { key: string; scope?: string }
  : never;

/** Representation of a reference to a dependency. */
export interface DependencyRef<
  K extends DependencySourceKind = DependencySourceKind,
> {
  /** The parsed components of the dependency specifier. */
  dependency: DependencySpec;
  /** Information about the source of the dependency. */
  source: DependencySource<K>;
}

const compare = (a: DependencyRef, b: DependencyRef) =>
  a.dependency.name.localeCompare(b.dependency.name);

/**
 * Collect dependencies from the given source, sorted by name.
 * @param paths The path to the source to collect dependencies from.
 * @param options The options to customize the collection process.
 */
export async function collect(
  path: string | URL,
): Promise<DependencyRef[]> {
  const ext = extname(path instanceof URL ? path.pathname : path);
  const refs =
    await (ext.match(/\.json(c?)$/) ? fromImportMap(path) : fromEsModule(path));
  return refs.sort(compare);
}

async function fromEsModule(
  path: string | URL,
): Promise<DependencyRef<"esm">[]> {
  await init();
  const mod = await parseModule(toUrl(path), await Deno.readFile(path));
  return mapNotNullish(
    mod.dependencies ?? [],
    (json) => fromDependencyJson(path, json),
  ).sort(compare);
}

function fromDependencyJson(
  path: string | URL,
  json: DependencyJson,
): DependencyRef<"esm"> | undefined {
  const dependency = tryParse(json.specifier);
  if (!dependency) return;

  const { span } = json.code ?? json.type ?? {};
  if (span && json.assertionType !== "json") {
    return {
      dependency,
      source: { path, kind: "esm", span },
    };
  }
}

async function fromImportMap(
  path: string | URL,
): Promise<DependencyRef<"import_map">[]> {
  const json = await readImportMapJson(path);

  const refs: DependencyRef<"import_map">[] = [];

  Object.entries(json.imports ?? {}).forEach(([key, value]) => {
    const dep = tryParse(value);
    if (!dep) return;
    refs.push({
      dependency: parse(value),
      source: { path, kind: "import_map", key },
    });
  });

  Object.entries(json.scopes ?? {}).forEach(([scope, imports]) =>
    Object.entries(imports).map(([key, value]) => {
      const dep = tryParse(value);
      if (!dep) return;
      refs.push({
        dependency: parse(value),
        source: { path, kind: "import_map", key, scope },
      });
    })
  );

  return refs;
}

/**
 * Rewrite the content of the source code to update the dependency.
 *
 * @param content The content of the source code.
 * @param source The information about the source of the dependency.
 * @param updated The updated dependency.
 *
 * @returns The updated content of the source code.
 */
export async function rewrite(
  ref: DependencyRef,
  target: string,
): Promise<void> {
  const updated = { ...ref.dependency, constraint: target };
  const content = await Deno.readTextFile(ref.source.path);

  const result = ref.source.kind === "esm"
    ? rewriteEsModule(ref as DependencyRef<"esm">, updated, content)
    : rewriteImportMap(ref as DependencyRef<"import_map">, updated, content);

  await Deno.writeTextFile(ref.source.path, result);
}

function rewriteEsModule(
  ref: DependencyRef<"esm">,
  updated: DependencySpec,
  content: string,
) {
  const eol = detect(content) ?? EOL;
  const lines = content.split(eol);

  const { span } = ref.source;
  const index = span.start.line;
  const original = lines[index];

  lines[index] = original.slice(0, span.start.character + 1) +
    stringify(updated) + original.slice(span.end.character - 1);

  return lines.join(eol);
}

function rewriteImportMap(
  ref: DependencyRef<"import_map">,
  updated: DependencySpec,
  content: string,
) {
  const src = ref.source;
  const json = parseImportMapJson(content);
  if (src.scope) {
    json.scopes![src.scope][src.key] = stringify(updated);
  } else {
    json.imports![src.key] = stringify(updated);
  }
  const str = JSON.stringify(json, null, 2);
  const eol = detect(content) ?? EOL;
  return format(str, eol) + eol;
}

/** Options for committing the updated dependency. */
export interface GitCommandOptions extends Deno.CommandOptions {
  /**
   * Path to the lockfile to update.
   * @example "deno.lock"
   */
  lock?: string | URL;
}

/**
 * Create a new git command to commit the updated dependency.
 *
 * @param refs The references to the dependency to commit.
 * @param message The message to use for the commit.
 * @param options The options to customize the git command.
 *
 * @returns The git command to commit the updated dependency.
 */
export function commit(
  refs: DependencyRef[],
  message: string,
  options: GitCommandOptions = {},
): Deno.Command {
  const srcs = distinct(
    refs.map((ref) => {
      const path = ref.source.path;
      return path instanceof URL ? path.pathname : path;
    }),
  );

  const args = ["commit", "-m", message, ...srcs];
  if (options.lock) args.push(options.lock.toString());

  return new Deno.Command("git", { args, ...options });
}
