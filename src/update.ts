import {
  createGraph,
  init as initDenoGraph,
  type ModuleJson,
} from "../lib/x/deno_graph.ts";
import { URI } from "../lib/uri.ts";
import type { Path, SemVerString } from "./types.ts";
import { ImportMap, ImportMapJson } from "./import_map.ts";
import { Dependency } from "./dependency.ts";
import { load } from "./loader.ts";

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

/** Representation of a dependency update. */
export interface DependencyUpdate extends Omit<Dependency, "version"> {
  /** The fully resolved specifier of the dependency. */
  specifier: URI<"http" | "https" | "npm">;
  version: {
    from: SemVerString;
    to: SemVerString;
  };
  /** The code of the dependency. */
  code: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: Path;
    span: NonNullable<DependencyJson["code"]>["span"];
  };
  /** The specifier of the module that imports the dependency. */
  referrer: URI<"file">;
  /** Information about the import map used to resolve the dependency. */
  map?: {
    /** The path to the import map used to resolve the dependency. */
    source: URI<"file">;
    from: Path;
    /** The string in the dependency specifier being replaced by the import map.
     * Mapping on a file specifier should not happen. */
    to: URI<"http" | "https" | "npm">;
  };
}

export const DependencyUpdate = {
  collect,
  create,
  applyToModule,
  applyToImportMap,
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
    ? await ImportMap.readFromJson(options.importMap)
    : undefined;

  const graph = await createGraph(specifiers, {
    load,
    resolve: importMap ? importMap.resolveSimple : undefined,
  });

  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await create(
          dependency,
          URI.from(module.specifier),
          { importMap },
        );
        return update ? updates.push(update) : undefined;
      })
    ),
  );
  return updates;
}

async function create(
  dependency: DependencyJson,
  referrer: URI<"file">,
  options?: {
    importMap?: ImportMap;
  },
): Promise<DependencyUpdate | undefined> {
  if (!dependency?.code?.specifier) {
    console.warn(
      `The dependency ${dependency.specifier} has no resolved specifier.`,
    );
    return;
  }
  const newSemVer = await Dependency.resolveLatestSemVer(
    new URL(dependency.code.specifier),
  );
  if (!newSemVer) {
    return;
  }
  const props = Dependency.parseProps(new URL(dependency.code.specifier));
  if (!props) {
    return;
  }
  const mapped = options?.importMap?.resolve(
    dependency.specifier,
    referrer,
  );
  return {
    ...props,
    // We prefer to put the fully resolved specifier here.
    specifier: URI.ensure("http", "https", "npm")(
      dependency.code.specifier,
    ),
    code: {
      // We prefer to put the original specifier here.
      specifier: dependency.specifier as Path,
      span: dependency.code.span,
    },
    version: {
      from: props.version as SemVerString,
      to: newSemVer as SemVerString,
    },
    referrer,
    map: mapped
      ? {
        source: options!.importMap!.specifier,
        from: mapped.from! as Path,
        to: URI.ensure("http", "https", "npm")(mapped.to!),
      }
      : undefined,
  };
}

function applyToModule(
  /** The dependency update to apply. */
  update: DependencyUpdate,
  /** Content of the module to update. */
  content: string,
): string {
  if (update.code.span.start.line !== update.code.span.end.line) {
    throw new Error(
      `The import specifier ${update.specifier} in ${update.referrer} is not a single line`,
    );
  }
  const line = update.code.span.start.line;
  const lines = content.split("\n");

  lines[line] = lines[line].slice(0, update.code.span.start.character) +
    `"${
      update.specifier.replace(
        update.version.from,
        update.version.to,
      )
    }"` +
    lines[line].slice(update.code.span.end.character);

  return lines.join("\n");
}

export function applyToImportMap(
  /** The dependency update to apply. */
  update: DependencyUpdate,
  /** Content of the import map to update. */
  content: string,
): string {
  const json = JSON.parse(content) as ImportMapJson;
  json.imports[update.map!.from] = update.map!.to.replace(
    update.version.from,
    update.version.to,
  );
  return JSON.stringify(json, null, 2);
}
