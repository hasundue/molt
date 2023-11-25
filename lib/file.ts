import { assertExists } from "./std/assert.ts";
import { parse as parseJsonc } from "./std/jsonc.ts";
import { detectEOL } from "./std/fs.ts";
import { toPath } from "./path.ts";
import { toUrl } from "./dependency.ts";
import { type DependencyUpdate } from "./update.ts";
import { ImportMapJson } from "./import_map.ts";

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
  return write(associateByFile(updates), options);
}

/**
 * A collection of updates to dependencies associated with a file.
 */
export interface FileUpdate {
  /** The URL of the file to update. */
  path: string;
  /** The type of the file to update. */
  kind: "module" | "import_map";
  /** The updates to dependencies associated with the file. */
  dependencies: DependencyUpdate[];
}

/**
 * Collect updates to files from the given updates to dependencies.
 * The collected updates are lexically sorted by the url of the file.
 */
export function associateByFile(
  dependencies: DependencyUpdate[],
): FileUpdate[] {
  /** A map from module URLs to dependency updates. */
  const fileToDepsMap = new Map<string, DependencyUpdate[]>();
  for (const dep of dependencies) {
    const referrer = dep.map?.source ?? dep.referrer;
    const deps = fileToDepsMap.get(referrer) ??
      fileToDepsMap.set(referrer, []).get(referrer)!;
    deps.push(dep);
  }
  return Array.from(fileToDepsMap.entries()).map((
    [referrer, dependencies],
  ) => ({
    path: referrer,
    kind: dependencies[0].map ? "import_map" : "module",
    dependencies,
  })).sort((a, b) => a.path.localeCompare(b.path)) as FileUpdate[];
}

/**
 * Write the given (array of) FileUpdate to file system.
 */
export async function write(
  updates: FileUpdate | FileUpdate[],
  options?: {
    onWrite?: (result: FileUpdate) => void | Promise<void>;
  },
) {
  for (const update of [updates].flat()) {
    await _write(update);
    await options?.onWrite?.(update);
  }
}

function _write(
  update: FileUpdate,
) {
  switch (update.kind) {
    case "module":
      return writeToModule(update);
    case "import_map":
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
  const path = toPath(update.path);
  const content = await Deno.readTextFile(path);
  const eol = detectEOL(content) ?? "\n";
  await Deno.writeTextFile(
    path,
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
            toUrl(dependency.to),
          )
          : line;
      })
      .join(eol),
  );
}

async function writeToImportMap(
  /** The dependency update to apply. */
  update: FileUpdate,
) {
  const path = toPath(update.path);
  const content = await Deno.readTextFile(path);
  const json = parseJsonc(content) as unknown as ImportMapJson;
  for (const dependency of update.dependencies) {
    assertExists(dependency.map);
    json.imports[dependency.map.key!] = dependency.map.resolved.replace(
      toUrl(dependency.from),
      toUrl(dependency.to),
    );
  }
  await Deno.writeTextFile(path, JSON.stringify(json, null, 2));
}
