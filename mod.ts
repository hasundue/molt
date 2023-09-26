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

import { fromFileUrl } from "https://deno.land/std@0.202.0/path/mod.ts";
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
import { ensureArray, relativeFromCwd, toFileSpecifier } from "./src/utils.ts";
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
  if (!entrypoints) {
    return [];
  }
  await DenoGraph.ensureInit();
  const specifiers = ensureArray(entrypoints).map((path) =>
    toFileSpecifier(path)
  );
  const graph = await createGraph(specifiers, {
    load: createLoad(options),
    resolve: await createResolve(options),
  });
  console.debug(graph.modules);
  const importMap = options.importMap
    ? await readFromJson(options.importMap)
    : undefined;
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await createDependencyUpdate(
          dependency,
          module.specifier,
          {
            importMap: options.importMap,
          },
        );
        return update
          ? updates.push({
            ...update,
            referrer: importMap?.tryResolve(dependency.specifier, module.specifier)
              ? options.importMap!
              : relativeFromCwd(fromFileUrl(module.specifier)),
          })
          : undefined;
      })
    ),
  );
  return updates;
}

export interface DependencyUpdateResult {
  /** The relative path to the module from the current working directory. */
  specifier: string;
  /** The updated content of the module. */
  content: string;
}

export interface ModuleContentUpdate extends DependencyUpdateResult {
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export function execDependencyUpdateAll(
  updates: DependencyUpdate[],
): ModuleContentUpdate[] {
  /** A map of module specifiers to the module content updates. */
  const results = new Map<string, ModuleContentUpdate>();
  for (const dependencyUpdate of updates) {
    const current = results.get(dependencyUpdate.referrer) ?? {
      specifier: dependencyUpdate.referrer,
      content: Deno.readTextFileSync(dependencyUpdate.referrer),
      dependencies: [],
    };
    const content = applyDependencyUpdate(dependencyUpdate, current.content);
    if (!content) {
      continue;
    }
    results.set(dependencyUpdate.referrer, {
      specifier: current.specifier,
      content,
      dependencies: current.dependencies.concat(dependencyUpdate),
    });
  }
  return Array.from(results.values());
}

export function applyDependencyUpdate(
  /** The dependency update to apply. */
  update: DependencyUpdate,
  /** Content of the module to update. */
  content: string,
): string | undefined {
  if (!update.code) {
    console.warn(`No code found for ${update.specifier}`);
    return;
  }
  if (update.code.span.start.line !== update.code.span.end.line) {
    console.warn(
      `The import specifier ${update.specifier} in ${update.referrer} is not a single line`,
    );
    return;
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
  onWrite?: (result: ModuleContentUpdate) => void;
}

export function writeModuleContentUpdateAll(
  updates: ModuleContentUpdate[],
  options: WriteModuleContentUpdateAllOptions = {},
): void {
  updates.forEach((it) => {
    writeModuleContentUpdate(it);
    options.onWrite?.(it);
  });
}

export function writeModuleContentUpdate(
  result: ModuleContentUpdate,
): void {
  Deno.writeTextFileSync(result.specifier, result.content);
}
