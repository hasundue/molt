import {
  createGraph,
  init as initDenoGraph,
  type ModuleJson,
} from "../lib/x/deno_graph.ts";
import { RelativePath, URI } from "../lib/uri.ts";
import type { SemVerString } from "./types.ts";
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
  code?: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: string;
    span: NonNullable<DependencyJson["code"]>["span"];
  };
  type?: {
    specifier: string;
    span: NonNullable<DependencyJson["type"]>["span"];
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
  applyToModule,
  applyToImportMap,
  withRelativePath,
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
        const update = await _create(
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

export async function _create(
  dependency: DependencyJson,
  referrer: URI<"file">,
  options?: {
    importMap?: ImportMap;
  },
): Promise<DependencyUpdate | undefined> {
  if (!dependency?.code?.specifier && !dependency?.type?.specifier) {
    throw new Error(
      `The dependency ${dependency.specifier} in ${
        URI.relative(referrer)
      } has no resolved specifier.`,
    );
  }
  const specifier = dependency.code?.specifier ?? dependency.type?.specifier!;
  const newSemVer = await Dependency.resolveLatestSemVer(new URL(specifier));
  if (!newSemVer) {
    return;
  }
  const props = Dependency.parseProps(new URL(specifier));
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
    specifier: URI.ensure("http", "https", "npm")(specifier),
    code: dependency.code && {
      // We prefer to put the original specifier here.
      specifier: dependency.specifier,
      span: dependency.code.span,
    },
    type: dependency.type && {
      // We prefer to put the original specifier here.
      specifier: dependency.specifier,
      span: dependency.type.span,
    },
    version: {
      from: props.version as SemVerString,
      to: newSemVer as SemVerString,
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

function applyToModule(
  /** The dependency update to apply. */
  update: DependencyUpdate,
  /** Content of the module to update. */
  content: string,
): string {
  const span = update.code?.span ?? update.type?.span!;
  if (span.start.line !== span.end.line) {
    throw new Error(
      `The import specifier ${update.specifier} in ${update.referrer} is not a single line`,
    );
  }
  const line = span.start.line;
  const lines = content.split("\n");

  lines[line] = lines[line].slice(0, span.start.character) +
    `"${
      update.specifier.replace(
        update.version.from,
        update.version.to,
      )
    }"` +
    lines[line].slice(span.end.character);

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

export type DependencyUpdateWithRelativePath =
  & Omit<DependencyUpdate, "specifier" | "map">
  & {
    specifier: RelativePath;
    map?: {
      source: RelativePath | URI<"http" | "https" | "npm">;
      from: string;
      to: URI<"http" | "https" | "npm">;
    };
  };

/**
 * Convert specifiers in the dependency update to relative paths for subsequent operations.
 */
function withRelativePath(
  update: DependencyUpdate,
): DependencyUpdateWithRelativePath {
  return {
    ...update,
    specifier: _relativeIfFile(update.specifier),
    map: update.map && {
      ...update.map,
      source: URI.relative(update.map.source),
    },
  } as DependencyUpdateWithRelativePath;
}

function _relativeIfFile(
  specifier: URI<"file" | "http" | "https" | "npm">,
) {
  return URI.is(specifier, "file") ? URI.relative(specifier) : specifier;
}
