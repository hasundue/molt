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
import {
  createDependencyUpdate,
  createLoad,
  createResolve,
  type DependencyUpdate,
} from "./src/core.ts";
import { URI } from "./src/uri.ts";
import { ImportMapJson, readFromJson } from "./src/import_map.ts";

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
  const specifiers = [entrypoints].flat().map((path) => URI.from(path));
  await DenoGraph.ensureInit();
  const graph = await createGraph(specifiers, {
    load: createLoad(options),
    resolve: await createResolve(options),
  });
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await createDependencyUpdate(
          dependency,
          URI.from(module.specifier),
          {
            importMap: options.importMap
              ? await readFromJson(options.importMap)
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
  /** The specifier of the updated dependency (a remote module or an import map.) */
  specifier: URI<"http" | "https" | "file">;
  /** The updated content of the module. */
  content: string;
}

export interface FileUpdate extends DependencyUpdateResult {
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export async function execDependencyUpdateAll(
  updates: DependencyUpdate[],
): Promise<FileUpdate[]> {
  /** A map of module specifiers to the module content updates. */
  const results = new Map<URI<"http" | "https" | "file">, FileUpdate>();
  for (const update of updates) {
    const referrer = update.map?.source ?? update.referrer;
    const current = results.get(referrer) ?? {
      specifier: referrer,
      content: await fetch(referrer).then((it) => it.text()),
      dependencies: [],
    } satisfies FileUpdate;
    const content = update.map
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

export function applyDependencyUpdateToImportMap(
  update: DependencyUpdate,
  content: string,
): string {
  const json = JSON.parse(content) as ImportMapJson;
  json.imports[update.map!.from] = update.map!.to.replace(
    update.version.from,
    update.version.to,
  );
  return JSON.stringify(json, null, 2);
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
