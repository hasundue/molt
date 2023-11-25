import { distinct } from "./std/collections.ts";
import { dirname, fromFileUrl } from "./std/path.ts";
import {
  createGraph,
  type CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
  type ModuleJson,
} from "./x/deno_graph.ts";
import { findFileUp, toPath, toUrl } from "./path.ts";
import { ImportMap, tryReadFromJson } from "./import_map.ts";
import {
  type Dependency,
  parse,
  resolveLatestVersion,
  type UpdatedDependency,
} from "./dependency.ts";

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

/**
 * Representation of an update to a dependency.
 */
export interface DependencyUpdate {
  /** Properties of the dependency being updated. */
  from: Dependency;
  /** Properties of the updated dependency. */
  to: UpdatedDependency;
  /**
   * The code of the dependency. Note that `type` in the DependencyJSON
   * is merged into `code` here for convenience.
   */
  code: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: string;
    span: NonNullable<DependencyJson["code"]>["span"];
  };
  /** The full path to the module that imports the dependency.
   * @example "/path/to/mod.ts" */
  referrer: string;
  /** Information about the import map used to resolve the dependency. */
  map?: {
    /** The full path to the import map used to resolve the dependency.
     * @example "/path/to/import_map.json" */
    source: string;
    /** The string in the dependency specifier being replaced */
    key?: string;
    /** The fully resolved specifier (URL) of the dependency. */
    resolved: string;
  };
}

class DenoGraph {
  static #initialized = false;

  static async ensureInit() {
    if (this.#initialized) {
      return;
    }
    await initDenoGraph();
    this.#initialized = true;
  }
}

export interface CollectOptions {
  /**
   * The path to the import map used to resolve dependencies.
   * If not specified, deno.json or deno.jsonc in the root directory of the module is used.
   *
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
   * If true, the import map is searched for in the parent directories of the first module specified.
   */
  findImportMap?: boolean;
  /**
   * A function to filter out dependencies.
   *
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
   *
   * @example
   * ```ts
   * const updates = await DependencyUpdate.collect("mod.ts", {
   *   only: (dep) => dep.name === "deno.land/std"
   *   // -> Only pick dependencies from deno.land/std
   * });
   * ```
   */
  only?: (dependency: Dependency) => boolean;
}

/**
 * Collect dependencies from the given module(s).
 * @param from - The path(s) to the module(s) to collect dependencies from.
 * @param options - Options to customize the behavior.
 * @returns The list of dependencies.
 */
export async function collect(
  from: string | URL | (string | URL)[],
  options: CollectOptions = {},
): Promise<DependencyUpdate[]> {
  const froms = [from].flat();
  const paths = froms.map((path) => toPath(path));
  const urls = froms.map((path) => toUrl(path));

  const importMapPath = options.importMap ??
    (options.findImportMap
      ? await findFileUp(dirname(paths[0]), "deno.json", "deno.jsonc")
      : undefined);

  const importMap = importMapPath
    ? await tryReadFromJson(toUrl(importMapPath))
    : undefined;

  await DenoGraph.ensureInit();
  const graph = await createGraph(urls, {
    load,
    resolve: importMap?.resolveInner,
  });

  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((m) =>
      m.dependencies?.map(async (dependency) => {
        const update = await create(
          dependency,
          m.specifier,
          { ...options, importMap },
        );
        return update ? updates.push(update) : undefined;
      })
    ),
  );
  return updates.sort((a, b) => a.to.name.localeCompare(b.to.name));
}

const load: NonNullable<CreateGraphOptions["load"]> = async (
  specifier,
) => {
  const url = new URL(specifier); // should not throw
  switch (url.protocol) {
    case "node:":
    case "npm:":
      return {
        kind: "external",
        specifier,
      };
    case "http:":
    case "https:":
      return {
        kind: "external",
        specifier,
      };
    case "file:":
      return await defaultLoad(specifier);
    default:
      throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
};

/**
 * Create a DependencyUpdate from the given dependency.
 * @param dependencyJson - The dependency to create an update from.
 * @param referrer - The URL of the module that imports the dependency.
 * @param options - Options to customize the behavior.
 * @returns The created DependencyUpdate.
 */
async function create(
  dependencyJson: DependencyJson,
  referrer: string,
  options?: Pick<CollectOptions, "ignore" | "only"> & {
    importMap?: ImportMap;
  },
): Promise<DependencyUpdate | undefined> {
  const specifier = dependencyJson.code?.specifier ??
    dependencyJson.type?.specifier;
  if (!specifier) {
    throw new Error(
      `The dependency ${dependencyJson.specifier} in ${
        fromFileUrl(referrer)
      } has no resolved specifier.`,
      { cause: dependencyJson },
    );
  }
  const mapped = options?.importMap?.resolve(
    dependencyJson.specifier,
    referrer,
  );
  const dependency = parse(new URL(mapped?.value ?? specifier));
  if (options?.ignore?.(dependency)) {
    return;
  }
  if (options?.only && !options.only(dependency)) {
    return;
  }
  const latest = await resolveLatestVersion(dependency);
  if (!latest || latest.version === dependency.version) {
    return;
  }
  const span = dependencyJson.code?.span ?? dependencyJson.type?.span;
  if (!span) {
    throw new Error(
      `The dependency ${dependencyJson.specifier} in ${
        fromFileUrl(referrer)
      } has no span.`,
    );
  }
  return {
    from: dependency,
    to: latest,
    code: {
      // We prefer to put the original specifier here.
      specifier: dependencyJson.specifier,
      span,
    },
    referrer: toPath(referrer),
    map: mapped
      ? {
        source: options!.importMap!.path,
        key: mapped.key,
        resolved: mapped.resolved,
      }
      : undefined,
  };
}

export type VersionChange = {
  from?: string;
  to: string;
};

export function getVersionChange(
  dependencies: DependencyUpdate[],
): VersionChange | undefined {
  const modules = distinct(dependencies.map((d) => d.to.name));
  if (modules.length > 1) {
    // Cannot provide a well-defined version prop
    return;
  }
  const tos = distinct(dependencies.map((d) => d.to.version));
  if (tos.length > 1) {
    throw new Error(
      "Multiple target versions are specified for a single module",
    );
  }
  const froms = distinct(dependencies.map((d) => d.from.version));
  return {
    from: froms.length === 1 ? froms[0] : undefined,
    to: tos[0],
  };
}
