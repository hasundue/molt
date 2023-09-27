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

import { URI } from "./lib/uri.ts";

export interface FileUpdate {
  /** The specifier of the updated dependency (a remote module.) */
  specifier: URI<"file">;
  /** The updated content of the module. */
  content: string;
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export function execDependencyUpdateAll(
  updates: DependencyUpdate[],
): FileUpdate[] {
  /** A map of module specifiers to the module content updates. */
  const results = new Map<URI<"file">, FileUpdate>();
  for (const update of updates) {
    const referrer = update.map?.source ?? update.referrer;
    const current = results.get(referrer) ?? {
      specifier: referrer,
      content: Deno.readTextFileSync(new URL(referrer)),
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
  Deno.writeTextFileSync(new URL(result.specifier), result.content);
}
