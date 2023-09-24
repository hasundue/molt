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
  fromFileUrl,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import {
  createGraph,
  CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import { createDependencyUpdate, type DependencyUpdate } from "./src/core.ts";
import { createUrl, relativeFromCwd } from "./src/utils.ts";

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

export interface CreateDependencyUpdateOptions {
  loadRemote?: boolean;
}

export async function collectDependencyUpdateAll(
  entrypoints: string | string[],
  options: CreateDependencyUpdateOptions = {
    loadRemote: false,
  },
): Promise<DependencyUpdate[]> {
  if (!entrypoints) {
    return [];
  }
  await DenoGraph.ensureInit();
  const specifiers = [entrypoints].flat().map((e) =>
    toFileUrl(resolve(e)).href
  );
  const graph = await createGraph(specifiers, {
    load: createLoadCallback(options),
  });
  const updates: DependencyUpdate[] = [];
  await Promise.all(
    graph.modules.flatMap((module) =>
      module.dependencies?.map(async (dependency) => {
        const update = await createDependencyUpdate(dependency);
        return update
          ? updates.push({
            ...update,
            referrer: relativeFromCwd(fromFileUrl(module.specifier)),
          })
          : undefined;
      })
    ),
  );
  return updates;
}

function createLoadCallback(
  options: CreateDependencyUpdateOptions,
): CreateGraphOptions["load"] {
  // deno-lint-ignore require-await
  return async (specifier) => {
    const url = createUrl(specifier);
    if (!url) {
      throw new Error(`Invalid specifier: ${specifier}`);
    }
    switch (url.protocol) {
      case "node:":
      case "npm:":
        return {
          kind: "external",
          specifier,
        };
      case "http:":
      case "https:":
        if (options.loadRemote) {
          return defaultLoad(specifier);
        }
        return {
          kind: "external",
          specifier,
        };
      default:
        return defaultLoad(specifier);
    }
  };
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
