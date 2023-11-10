import { assertExists } from "./std/assert.ts";
import { parse as parseJsonc } from "./std/jsonc.ts";
import { detectEOL } from "./std/fs.ts";
import { Dependency } from "./dependency.ts";
import { DependencyUpdate } from "./update.ts";
import { ImportMapJson } from "./import_map.ts";
import { URI } from "./uri.ts";

/**
 * Write the given array of DependencyUpdate to files.
 *
 * @returns A promise that resolves when all updates are written.
 *
 * @example
 * ```ts
 * await writeAll(updates, {
 *   onWrite: (file) => {
 *     console.log(`Updated ${file.specifier}`);
 *   },
 * });
 * ```
 */
export function writeAll(
  updates: DependencyUpdate[],
  options?: {
    onWrite?: (file: FileUpdate) => void | Promise<void>;
  },
) {
  return FileUpdate.write(FileUpdate.collect(updates), options);
}

/**
 * A collection of updates to dependencies associated with a file.
 */
export interface FileUpdate {
  /** The specifier of the file to update. */
  specifier: URI<"file">;
  /** The type of the file to update. */
  kind: "module" | "import-map";
  /** The updates to dependencies associated with the file. */
  dependencies: DependencyUpdate[];
}
export const FileUpdate = {
  /**
   * Collect updates to files from the given updates to dependencies.
   * The collected updates are lexically sorted by the specifier of the file.
   */
  collect(
    from: DependencyUpdate[],
  ): FileUpdate[] {
    /** A map of module specifiers to the module content updates. */
    const fileToDepsMap = new Map<URI<"file">, DependencyUpdate[]>();
    for (const dependency of from) {
      const referrer = dependency.map?.source ?? dependency.referrer;
      const deps = fileToDepsMap.get(referrer) ??
        fileToDepsMap.set(referrer, []).get(referrer)!;
      deps.push(dependency);
    }
    return Array.from(fileToDepsMap.entries()).map((
      [specifier, dependencies],
    ) => ({
      kind: dependencies[0].map ? "import-map" : "module",
      specifier,
      dependencies,
    })).sort((a, b) => a.specifier.localeCompare(b.specifier)) as FileUpdate[];
  },
  /**
   * Write the given (array of) FileUpdate to file system.
   */
  async write(
    updates: FileUpdate | FileUpdate[],
    options?: {
      onWrite?: (result: FileUpdate) => void | Promise<void>;
    },
  ) {
    for (const update of [updates].flat()) {
      await _write(update);
      await options?.onWrite?.(update);
    }
  },
};

function _write(
  update: FileUpdate,
) {
  switch (update.kind) {
    case "module":
      return writeToModule(update);
    case "import-map":
      return writeToImportMap(update);
  }
}

async function writeToModule(
  update: FileUpdate,
) {
  const lineToDependencyMap = new Map<number, DependencyUpdate>(
    update.dependencies.map((
      dependency,
    ) => [dependency.code.span.start.line, dependency]),
  );
  const content = await Deno.readTextFile(new URL(update.specifier));
  const eol = detectEOL(content) ?? "\n";
  await Deno.writeTextFile(
    new URL(update.specifier),
    content
      .split(eol)
      .map((line, index) => {
        const dependency = lineToDependencyMap.get(index);
        return dependency
          ? line.replace(
            line.slice(
              dependency.code.span.start.character + 1,
              dependency.code.span.end.character - 1,
            ),
            Dependency.toURI(dependency.to),
          )
          : line;
      })
      .join(eol),
  );
}

async function writeToImportMap(
  /** The dependency update to apply. */
  update: FileUpdate,
): Promise<void> {
  const content = await Deno.readTextFile(new URL(update.specifier));
  const json = parseJsonc(content) as unknown as ImportMapJson;
  for (const dependency of update.dependencies) {
    assertExists(dependency.map);
    json.imports[dependency.map.from] = dependency.map.to.replace(
      Dependency.toURI(dependency.from),
      Dependency.toURI(dependency.to),
    );
  }
  await Deno.writeTextFile(
    new URL(update.specifier),
    JSON.stringify(json, null, 2),
  );
}
