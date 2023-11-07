import { assertExists } from "./std/assert.ts";
import { parse as parseJsonc } from "./std/jsonc.ts";
import { detectEOL } from "./std/fs.ts";
import { Dependency } from "./dependency.ts";
import { DependencyUpdate } from "./update.ts";
import { ImportMapJson } from "./import_map.ts";
import { URI } from "./uri.ts";

export interface FileUpdate {
  /** The type of the updated file. */
  kind: "module" | "import-map";
  /** The specifier of the updated dependency (a remote module.) */
  specifier: URI<"file">;
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export const FileUpdate = {
  collect,
  write,
  writeAll,
};

/**
 * Collect updates to files from the given updates to dependencies.
 * The collected updates are lexically sorted by the specifier of the file.
 *
 * @param dependencies The dependencies to collect updates from.
 * @returns The collected dependency updates.
 *
 * @example
 * ```ts
 * const updates = FileUpdate.collect(
 *   DependencyUpdate.collect("./mod.ts")
 * );
 * ```
 */
function collect(
  dependencies: DependencyUpdate[],
): FileUpdate[] {
  /** A map of module specifiers to the module content updates. */
  const fileToDepsMap = new Map<URI<"file">, DependencyUpdate[]>();
  for (const dependency of dependencies) {
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
}

async function writeAll(
  updates: FileUpdate[],
  options?: {
    onWrite?: (result: FileUpdate) => void | Promise<void>;
  },
) {
  for (const update of updates) {
    await write(update);
    await options?.onWrite?.(update);
  }
}

function write(
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
      .trimEnd()
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
