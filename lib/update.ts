import { distinct } from "./std/collections.ts";
import { fromFileUrl } from "./std/path.ts";
import {
  createGraph,
  type CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
  type ModuleJson,
} from "./x/deno_graph.ts";
import { findFileUp, toPath, toUrl } from "./path.ts";
import {
  ImportMap,
  ImportMapResolveResult,
  readImportMapJson,
  tryReadFromJson,
} from "./import_map.ts";
import {
  type Dependency,
  parse,
  resolveLatestVersion,
  toUrl as dependencyToUrl,
  type UpdatedDependency,
} from "./dependency.ts";

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

type If<T extends boolean, A, B> = T extends true ? A : B;

/**
 * Representation of an update to a dependency.
 */
export interface DependencyUpdate<IsMapped extends boolean = boolean> {
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
    span: If<IsMapped, undefined, NonNullable<DependencyJson["code"]>["span"]>;
  };
  /** The full path to the module that imports the dependency.
   * @example "/path/to/mod.ts" */
  referrer: string;
  /** Information about the import map used to resolve the dependency. */
  map: If<
    IsMapped,
    {
      /** The full path to the import map used to resolve the dependency.
       * @example "/path/to/import_map.json" */
      source: string;
    } & ImportMapResolveResult<true>,
    undefined
  >;
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
   * The working directory to resolve relative paths.
   * If not specified, the current working directory is used.
   * At present, this option is only used to find the import map.
   *
   * @example "/path/to/project"
   */
  cwd?: string | URL;
  /**
   * The path to the import map used to resolve dependencies.
   * If not specified, molt will automatically find deno.json or deno.jsonc
   * in the current working directory or parent directories.
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
 * Collect dependencies from the given module(s) or Deno configuration file(s).
 * Local submodules are also checked recursively.
 *
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
): Promise<DependencyUpdate[]> {
  const froms = [from].flat();
  const urls = froms.map((path) => toUrl(path));

  const importMapPath = options.importMap ??
    await findFileUp(options.cwd ?? Deno.cwd(), "deno.json", "deno.jsonc");

  const importMap = importMapPath
    ? await tryReadFromJson(toUrl(importMapPath))
    : undefined;

  await DenoGraph.ensureInit();
  const graph = await createGraph(urls, {
    load,
    resolve: importMap?.resolveInner,
  });

  const updates: DependencyUpdate[] = [];
  await Promise.all([
    ...graph.modules
      .filter((m) => m.kind === "esm")
      .flatMap((m) =>
        m.dependencies?.map(async (dependency) => {
          const update = await _createDependencyUpdate(
            dependency,
            m.specifier,
            { ...options, importMap },
          );
          return update ? updates.push(update) : undefined;
        })
      ),
    ...graph.modules
      .filter((m) => m.kind === "asserted" && m.mediaType === "Json")
      .map(async (m) => {
        const results = await _collectFromImportMap(m.specifier, options);
        updates.push(...results);
      }),
  ]);
  return updates.sort((a, b) => a.to.name.localeCompare(b.to.name));
}

const load: NonNullable<CreateGraphOptions["load"]> = async (
  specifier,
) => {
  const url = new URL(specifier); // should not throw
  switch (url.protocol) {
    case "node:":
    case "npm:":
    case "jsr:":
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
async function _createDependencyUpdate(
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
  ) as ImportMapResolveResult<true> | undefined;
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
        ...mapped,
      }
      : undefined,
  };
}

async function _collectFromImportMap(
  specifier: ModuleJson["specifier"],
  options: Pick<CollectOptions, "ignore" | "only">,
): Promise<DependencyUpdate[]> {
  const json = await readImportMapJson(new URL(specifier));
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    Object.entries(json.imports).map(
      async ([key, value]): Promise<DependencyUpdate | undefined> => {
        if (!URL.canParse(value)) {
          return;
        }
        const dependency = parse(new URL(value));
        if (options.ignore?.(dependency)) {
          return;
        }
        if (options.only && !options.only(dependency)) {
          return;
        }
        const latest = await resolveLatestVersion(dependency);
        if (!latest || latest.version === dependency.version) {
          return;
        }
        updates.push({
          from: dependency,
          to: latest,
          code: {
            specifier: value,
            span: undefined,
          },
          referrer: toPath(specifier),
          map: {
            source: toPath(specifier),
            resolved: value,
            key,
            value: dependencyToUrl(latest),
          },
        });
      },
    ),
  );
  return updates;
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
