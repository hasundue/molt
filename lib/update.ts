import { distinct } from "./std/collections.ts";
import {
  createGraph,
  type CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
  type ModuleJson,
} from "./x/deno_graph.ts";
import { URI } from "./uri.ts";
import type { Maybe } from "./types.ts";
import { ImportMap } from "./import_map.ts";
import { Dependency, LatestDependency } from "./dependency.ts";

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

/** Representation of an update to a dependency. */
export interface DependencyUpdate {
  /** Properties of the dependency being updated. */
  from: Dependency;
  /** Properties of the dependency after the update. */
  to: LatestDependency;
  /** The code of the dependency. Note that `type` in the DependencyJSON is
   * merged into `code` here for convenience. */
  code: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: string;
    span: NonNullable<DependencyJson["code"]>["span"];
  };
  /** The specifier of the module that imports the dependency. */
  referrer: URI<"file">;
  /** Information about the import map used to resolve the dependency. */
  map?: {
    /** The path to the import map used to resolve the dependency. */
    source: URI<"file">;
    from: string;
    /** The string in the dependency specifier being replaced by the import map.
     * Mapping on a file specifier should not happen. */
    to: URI<"http" | "https" | "npm">;
  };
}

export const DependencyUpdate = {
  collect,
  getVersionChange,
};

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

export async function collect(
  entrypoints: string | string[],
  options: {
    importMap?: string;
  } = {},
): Promise<DependencyUpdate[]> {
  // This could throw if the entrypoints are not valid URIs.
  const specifiers = [entrypoints].flat().map((path) => URI.from(path));

  // Ensure the deno_graph WASM module is initialized.
  await DenoGraph.ensureInit();

  const importMap = options.importMap
    ? await ImportMap.readFromJson(URI.from(options.importMap))
    : undefined;

  const graph = await createGraph(specifiers, {
    load,
    resolve: importMap ? importMap.resolveInner : undefined,
  });

  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await _create(
          dependency,
          URI.from(module.specifier),
          { importMap },
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

export async function _create(
  dependencyJson: DependencyJson,
  referrer: URI<"file">,
  options?: { importMap?: ImportMap },
): Promise<Maybe<DependencyUpdate>> {
  const specifier = dependencyJson.code?.specifier ??
    dependencyJson.type?.specifier;
  if (!specifier) {
    throw new Error(
      `The dependency ${dependencyJson.specifier} in ${
        URI.relative(referrer)
      } has no resolved specifier.`,
    );
  }
  const mapped = options?.importMap?.resolve(
    dependencyJson.specifier,
    referrer,
  );
  const dependency = Dependency.parse(new URL(mapped?.to ?? specifier));
  const latest = await Dependency.resolveLatest(dependency);
  if (!latest) {
    return;
  }
  const span = dependencyJson.code?.span ?? dependencyJson.type?.span;
  if (!span) {
    throw new Error(
      `The dependency ${dependencyJson.specifier} in ${
        URI.relative(referrer)
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
    referrer,
    map: mapped
      ? {
        source: options!.importMap!.specifier,
        from: mapped.from!,
        to: URI.ensure("http", "https", "npm")(mapped.to!),
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
): Maybe<VersionChange> {
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
