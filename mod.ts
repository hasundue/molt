// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to update dependencies in Deno projects using deno_graph.
 *
 * ### Example
 *
 * To update all dependencies in a module and commit the changes to git:
 *
 * ```ts
 * import { collectDependencyUpdateAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 * import { commitDependencyUpdateAll } from "https://deno.land/x/molt@{VERSION}/git/mod.ts";
 *
 * const updates = await collectDependencyUpdateAll("./mod.ts");
 * console.log(updates);
 *
 * // Commit all changes to git
 * commitDependencyUpdateAll(updates, {
 *   groupBy: (dependency) => dependency.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 * ```
 *
 * @module
 */

import {
  createGraph,
  init as initDenoGraph,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import type { Path, Url } from "./src/types.ts";
import {
  createDependencyUpdate,
  createLoad,
  createResolve,
  type DependencyUpdate,
} from "./src/core.ts";
import { ensureUri, ensurePath, toArray, toFileUri } from "./src/utils.ts";
import { readFromJson } from "./src/import_map.ts";

export { type DependencyUpdate } from "./src/core.ts";

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

export interface CollectDependencyUpdateOptions {
  /** The path to the json including import maps. */
  importMap?: string;
  loadRemote?: boolean;
}

export async function collectDependencyUpdateAll(
  entrypoints: string | string[],
  options: CollectDependencyUpdateOptions = {},
): Promise<DependencyUpdate[]> {
  const _entrypoints = toArray(entrypoints);
  if (!_entrypoints.length) {
    return [];
  }
  const _options = {
    importMap: options.importMap ? ensurePath(options.importMap) : undefined,
    loadRemote: options.loadRemote,
  };
  const specifiers = _entrypoints.map((path) => {
    return toFileUri(ensurePath(path))
  });
  await DenoGraph.ensureInit();
  const graph = await createGraph(specifiers, {
    load: createLoad(_options),
    resolve: await createResolve(_options),
  });
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await createDependencyUpdate(
          dependency,
          ensureUri(module.specifier),
          {
            importMap: _options.importMap
              ? await readFromJson(_options.importMap)
              : undefined,
          },
        );
        return update ? updates.push(update) : undefined;
      })
    ),
  );
  return updates;
}

export interface DependencyUpdateResult {
  /** The specifier of the updated dependency. */
  specifier: Path | Url;
  /** The updated content of the module. */
  content: string;
}

export interface FileUpdate extends DependencyUpdateResult {
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export function execDependencyUpdateAll(
  updates: DependencyUpdate[],
): FileUpdate[] {
  /** A map of module specifiers to the module content updates. */
  const results = new Map<Path | Url, FileUpdate>();
  for (const update of updates) {
    const specifier = update.importMap ?? update.referrer;
    const current = results.get(specifier) ?? {
      specifier,
      content: Deno.readTextFileSync(specifier),
      dependencies: [],
    } satisfies FileUpdate;
    const content = update.importMap
      ? applyDependencyUpdateToImportMap(update, current.content)
      : applyDependencyUpdate(update, current.content);
    results.set(update.referrer, {
      specifier: current.specifier,
      content,
      dependencies: current.dependencies.concat(update),
    });
  }
  return Array.from(results.values());
}

export function applyDependencyUpdate(
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

export interface WriteModuleContentUpdateAllOptions {
  onWrite?: (result: FileUpdate) => void;
}

export function writeModuleContentUpdateAll(
  updates: FileUpdate[],
  options: WriteModuleContentUpdateAllOptions = {},
): void {
  updates.forEach((it) => {
    writeModuleContentUpdate(it);
    options.onWrite?.(it);
  });
}

export function writeModuleContentUpdate(
  result: FileUpdate,
): void {
  Deno.writeTextFileSync(result.specifier, result.content);
}
