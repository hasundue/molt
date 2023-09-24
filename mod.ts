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
 * import { commitAll } from "https://deno.land/x/molt@{VERSION}/git/mod.ts";
 *
 * const updates = await collectDependencyUpdateAll("./mod.ts");
 * console.log(updates);
 *
 * // Commit all changes to git
 * await commitAll(updates, {
 *   groupBy: (it) => it.name,
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
import {
  createDependencyUpdate,
  DependencyUpdate as _DependencyUpdate,
} from "./src/core.ts";
import { createUrl, relativeFromCwd } from "./src/utils.ts";

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

export interface DependencyUpdate extends _DependencyUpdate {
  /** The relative path to the module from the current working directory. */
  referrer: string;
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

export interface ModuleUpdateResult {
  /** The relative path to the module from the current working directory. */
  specifier: string;
  /** The updated content of the module. */
  content: string;
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export function execAll(
  updates: DependencyUpdate[],
): ModuleUpdateResult[] {
  const results = new Map<string, ModuleUpdateResult>();
  updates.forEach((u) => exec(u, results));
  return Array.from(results.values());
}

export function exec(
  update: DependencyUpdate,
  /** The results of previous updates. */
  results?: Map<string, ModuleUpdateResult>,
): ModuleUpdateResult | undefined {
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
  const content = results?.get(update.referrer)?.content ??
    Deno.readTextFileSync(update.referrer);
  const lines = content.split("\n");

  lines[line] = lines[line].slice(0, update.code.span.start.character) +
    `"${update.specifier.replace(update.version.from, update.version.to)}"` +
    lines[line].slice(update.code.span.end.character);

  const result: ModuleUpdateResult = results?.get(update.referrer) ?? {
    specifier: update.referrer,
    content,
    dependencies: [],
  };
  result.content = lines.join("\n");
  result.dependencies.push(update);
  results?.set(update.referrer, result);
  return result;
}

export function writeAll(
  results: ModuleUpdateResult[],
): void {
  results.forEach(write);
}

export function write(
  result: ModuleUpdateResult,
): void {
  Deno.writeTextFileSync(result.specifier, result.content);
}
