import { findFileUp, toPath, toUrl } from "@molt/lib/path";
import { assertExists } from "@std/assert";
import { partition } from "@std/collections";
import { exists } from "@std/fs";
import type {
  DependencyJson,
  ModuleJson,
  ResolvedDependency,
} from "@deno/graph/types";
import { createGraphLocally } from "./graph.ts";
import {
  type ImportMap,
  type ImportMapResolveResult,
  readImportMapJson,
  tryReadFromJson,
} from "./import_map.ts";
import {
  type Dependency,
  hasVersionRange,
  parse,
  resolveLatestVersion,
  stringify,
  type UpdatedDependency,
} from "./dependency.ts";
import {
  collectUpdateFromLockFile,
  CommandError,
  createLockPart,
  type LockFile,
  type LockPart,
  readLockFile,
} from "./lockfile.ts";

export type SourceType = "import_map" | "module" | "lockfile";

/**
 * Representation of an update to a dependency.
 */
export interface DependencyUpdate<
  T extends SourceType = SourceType,
> {
  /**
   * Properties of the dependency being updated.
   * Undefined if the dependency is added.
   */
  from: T extends "lockfile" ? Dependency | undefined : Dependency;
  /*
   * Properties of the updated dependency.
   */
  to: UpdatedDependency;
  /**
   * The code of the dependency. Note that `type` in the DependencyJSON
   * is merged into `code` here for convenience.
   */
  code: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: string;
    span: T extends "module" ? NonNullable<DependencyJson["code"]>["span"]
      : undefined;
  };
  /**
   * Information about the import map used to resolve the dependency.
   */
  map: T extends "import_map" ? {
      /** The full path to the import map used to resolve the dependency.
       * @example "/path/to/import_map.json" */
      source: string;
    } & ImportMapResolveResult<true>
    : undefined;
  /** The full path to the module that imports the dependency.
   * @example "/path/to/mod.ts" */
  referrer: string;
}

export function sourceTypeOf(update: DependencyUpdate): SourceType {
  if (update.map) {
    return "import_map";
  } else if (update.code.span) {
    return "module";
  } else {
    return "lockfile";
  }
}

export interface CollectOptions {
  /**
   * Whether to use the cache to resolve dependencies.
   * @default true
   */
  cache?: boolean;
  /**
   * The working directory to resolve relative paths.
   * If not specified, the current working directory is used.
   * @example "/path/to/project"
   */
  cwd?: string | URL;
  /**
   * The path to the import map used to resolve dependencies.
   * If not specified, molt will automatically find deno.json or deno.jsonc
   * in the current working directory or parent directories.
   * @example
   * ```ts
   * const updates = await DependencyUpdate.collect("mod.ts", {
   *   importMap: "import_map.json"
   *   // -> Use import_map.json in the current directory
   * });
   * ```
   */
  importMap?: string | URL;
  /**
   * Whether to collect updates from the lockfile and update it.
   * @default false
   */
  lock?: boolean;
  /**
   * The path to the lockfile being updated.
   * If not specified, molt will try to find `deno.lock` in the current directory
   * or parent directories.
   * @example "./deno/lock.json"
   */
  lockFile?: string | URL;
  /**
   * A function to filter out dependencies.
   * @example
   * ```ts
   * const updates = await DependencyUpdate.collect("mod.ts", {
   *   ignore: (dep) => dep.name === "deno.land/std"
   *   // -> Ignore all dependencies from deno.land/std
   * });
   * ```
   */
  ignore?: (dependency: Dependency) => boolean;
  /**
   * A function to pick dependencies.
   * @example
   * ```ts
   * const updates = await DependencyUpdate.collect("mod.ts", {
   *   only: (dep) => dep.name === "deno.land/std"
   *   // -> Only pick dependencies from deno.land/std
   * });
   * ```
   */
  only?: (dependency: Dependency) => boolean;
  /**
   * Whether to resolve local submodules.
   * @default true
   */
  resolveLocal?: boolean;
}

/**
 * The result of collecting dependencies.
 */
export interface CollectResult {
  /** Partial lockfiles for all dependencies found, which will be used to update the lockfile. */
  locks: LockPart[];
  /** The updates to dependencies. */
  updates: DependencyUpdate[];
}

/**
 * Collect dependencies from the given module(s) or Deno configuration file(s).
 * Local submodules are also checked recursively.

 * @param from - The path(s) to the file(s) to collect dependencies from.
 * @param options - Options to customize the behavior.
 * @returns The list of dependencies.
 *
 * @example
 * ```ts
 * collect("mod.ts")
 * // -> Collect dependencies from mod.ts and its local submodules.
 * ```
 * @example
 * ```ts
 * collect("deno.json")
 * // -> Collect dependencies from the import map specified in deno.json
 * ```
 */
export async function collect(
  from: string | URL | (string | URL)[],
  options: CollectOptions = {},
): Promise<CollectResult> {
  const cwd = options.cwd ?? Deno.cwd();

  const importMapPath = options.importMap ??
    await findFileUp(cwd, "deno.json", "deno.jsonc");
  const importMap = importMapPath
    ? await tryReadFromJson(toUrl(importMapPath))
    : undefined;

  const lockFilePath = (options.lock ?? false)
    ? (options.lockFile ??
      (importMapPath
        ? await maybeFile(new URL("deno.lock", toUrl(importMapPath)))
        : undefined))
    : undefined;
  const lockFile = lockFilePath ? await readLockFile(lockFilePath) : undefined;

  const urls = [from].flat().map((path) => toUrl(path));
  const [jsons, esms] = partition(urls, isJsonPath);

  const graph = await createGraphLocally(esms, {
    resolve: importMap?.resolveInner,
    resolveLocal: options.resolveLocal ??= true,
  });

  const _options: CollectInnerOptions = {
    cache: true,
    ...options,
    importMap,
    lockFile,
  };
  const showResolveWarning = (
    mod: ModuleJson,
    errorDependency: ErrorResolvedDependency,
  ) => {
    const { error, span: { start } } = errorDependency;
    console.warn(
      `Failed to resolve dependency at ${mod.specifier}:${start.line}:${start.character}: ${error}`,
    );
  };
  const result = reduceCollectResult(
    await Promise.all([
      ...graph.modules.flatMap((mod) =>
        (mod.dependencies ?? [])
          .filter((dependency) => {
            if (isErrorResolvdDependency(dependency.code)) {
              showResolveWarning(mod, dependency.code);
              return false;
            }
            if (isErrorResolvdDependency(dependency.type)) {
              showResolveWarning(mod, dependency.type);
              return false;
            }
            return true;
          })
          .map((dependency) =>
            collectFromDependency(dependency, mod.specifier, _options)
          )
      ),
      ...jsons.map((url) => collectFromImportMap(url, _options)),
    ]),
  );
  return {
    locks: result.locks,
    updates: result.updates.sort((a, b) => a.to.name.localeCompare(b.to.name)),
  };
}

//----------------------------------
//
// Inner functions and types
//
//----------------------------------

interface CollectInnerOptions
  extends Omit<CollectOptions, "importMap" | "lockFile"> {
  importMap?: ImportMap;
  lockFile?: LockFile;
}

function reduceCollectResult(
  results: CollectResult[],
): CollectResult {
  return results.reduce(
    (acc, { locks, updates }) => ({
      locks: acc.locks.concat(locks),
      updates: acc.updates.concat(updates),
    }),
    { locks: [], updates: [] },
  );
}

/** Create a DependencyUpdate from the given dependency. */
async function collectFromDependency(
  dependencyJson: DependencyJson,
  referrer: string,
  options: CollectInnerOptions,
): Promise<CollectResult> {
  const resolved = dependencyJson.code?.specifier ??
    dependencyJson.type?.specifier;
  if (!resolved) {
    throw new Error(
      `Could not resolve the dependency: ${dependencyJson.specifier}`,
      { cause: dependencyJson },
    );
  }
  if (resolved.startsWith("file:")) {
    return { locks: [], updates: [] };
  }
  const lock = options.lockFile
    ? await createLockPart(resolved, options.lockFile)
    : undefined;
  const mapped = options.importMap?.resolve(
    dependencyJson.specifier,
    referrer,
  ) as ImportMapResolveResult<true> | undefined;
  const dependency = parse(new URL(mapped?.value ?? resolved));
  const none = { locks: lock ? [lock] : [], updates: [] };
  if (options.ignore?.(dependency) || options.only?.(dependency) === false) {
    return none;
  }
  if (options.lockFile && hasVersionRange(dependency)) {
    return {
      ...none,
      updates: await collectUpdateFromLockFile(
        options.lockFile,
        await createLockPart(resolved),
      ),
    };
  }
  const latest = await resolveLatestVersion(dependency, {
    cache: options.cache,
  });
  if (!latest || latest.version === dependency.version) {
    return none;
  }
  const span = dependencyJson.code?.span ?? dependencyJson.type?.span;
  assertExists(span);
  const update = {
    from: normalizeWithUpdated(dependency, latest),
    to: latest,
  };
  const updates: DependencyUpdate[] = [{
    ...update,
    code: {
      // We prefer to put the original specifier here.
      specifier: dependencyJson.specifier,
      span,
    },
    map: mapped ? { source: options.importMap!.path, ...mapped } : undefined,
    referrer: toPath(referrer),
  }];
  if (options.lockFile) {
    updates.push({
      ...update,
      code: { specifier: resolved, span: undefined },
      map: undefined,
      referrer: options.lockFile.path,
    });
  }
  return { ...none, updates };
}

async function collectFromImportMap(
  path: string,
  options: CollectInnerOptions,
): Promise<CollectResult> {
  const json = await readImportMapJson(new URL(path));
  return reduceCollectResult(
    await Promise.all(
      Object.entries(json.imports).map((entry) =>
        collectFromImportMapEntry(path, entry, options)
      ),
    ),
  );
}

async function collectFromImportMapEntry(
  path: string,
  entry: [string, string],
  options: CollectInnerOptions,
): Promise<CollectResult> {
  const [mapFrom, mapTo] = entry;
  if (!URL.canParse(mapTo)) { // map to a local file
    return { locks: [], updates: [] };
  }
  const lock = options.lockFile
    ? await _createLockPart(mapTo, options.lockFile)
    : undefined;
  const dependency = parse(new URL(mapTo));
  const none = { locks: lock ? [lock] : [], updates: [] };
  if (options.ignore?.(dependency) || options.only?.(dependency) === false) {
    return none;
  }
  if (options.lockFile && hasVersionRange(dependency)) {
    return {
      ...none,
      updates: await collectUpdateFromLockFile(
        options.lockFile,
        await createLockPart(mapTo),
      ),
    };
  }
  const latest = await resolveLatestVersion(dependency, {
    cache: options.cache,
  });
  if (!latest || latest.version === dependency.version) {
    return none;
  }
  const update = {
    from: normalizeWithUpdated(dependency, latest),
    to: latest,
  };
  const updates: DependencyUpdate[] = [{
    ...update,
    code: {
      specifier: mapTo,
      span: undefined,
    },
    map: {
      source: toPath(path),
      resolved: mapTo,
      key: mapFrom,
      value: stringify(latest),
    },
    referrer: toPath(path),
  }];
  if (options.lockFile) {
    updates.push({
      ...update,
      code: { specifier: mapTo, span: undefined },
      map: undefined,
      referrer: options.lockFile.path,
    });
  }
  return { ...none, updates };
}

async function _createLockPart(
  specifier: string,
  locked?: LockFile,
): Promise<LockPart> {
  try {
    return await createLockPart(specifier, locked);
  } catch (err) {
    if (err instanceof CommandError) {
      throw new Deno.errors.NotSupported(
        `Can't update a lockfile for an import map including any URL that can'be imported as is.`,
        { cause: specifier },
      );
    }
    throw err;
  }
}

//----------------------------------
//
// Utility functions
//
//----------------------------------

async function maybeFile(path: string | URL) {
  return await exists(path) ? path : undefined;
}

function isJsonPath(path: string) {
  return path.endsWith(".json") || path.endsWith(".jsonc");
}

function normalizeWithUpdated(
  dependency: Dependency,
  updated: UpdatedDependency,
): Dependency {
  if (dependency.version) {
    return dependency;
  }
  return {
    ...updated,
    version: undefined,
  };
}

type ErrorResolvedDependency = ResolvedDependency & {
  error: NonNullable<ResolvedDependency["error"]>;
};

function isErrorResolvdDependency(
  x: ResolvedDependency | undefined,
): x is ErrorResolvedDependency {
  return x?.error != null;
}
