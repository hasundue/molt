import { detectEOL, EOL, formatEOL } from "./std/fs.ts";
import { toUrl } from "./dependency.ts";
import { type DependencyUpdate } from "./update.ts";
import { parseImportMapJson } from "./import_map.ts";

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

type FileKind = "module" | "import_map";

/**
 * A collection of updates to dependencies associated with a file.
 */
export interface FileUpdate<
  Kind extends FileKind = FileKind,
> {
  /** The full path to the file being updated.
   * @example "/path/to/mod.ts" */
  path: string;
  /** The type of the file being updated. */
  kind: Kind;
  /** The updates to dependencies associated with the file. */
  dependencies: DependencyUpdate<Kind extends "import_map" ? true : false>[];
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
      return writeToModule(update as FileUpdate<"module">);
    case "import_map":
      return writeToImportMap(update as FileUpdate<"import_map">);
  }
}

async function writeToModule(
  update: FileUpdate<"module">,
) {
  const lineToDependencyMap = new Map(
    update.dependencies.map((
      dependency,
    ) => [dependency.code.span.start.line, dependency]),
  );
  const content = await Deno.readTextFile(update.path);
  const eol = detectEOL(content) ?? EOL;
  await Deno.writeTextFile(
    update.path,
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
  update: FileUpdate<"import_map">,
) {
  const content = await Deno.readTextFile(update.path);
  const json = parseImportMapJson(content);
  for (const dependency of update.dependencies) {
    json.imports[dependency.map.key] = toUrl(dependency.to);
  }
  const eol = detectEOL(content) ?? EOL;
  await Deno.writeTextFile(
    update.path,
    formatEOL(JSON.stringify(json, null, 2), eol) + eol,
  );
}
