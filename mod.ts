// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to update dependencies in Deno projects using deno_graph.
 *
 * ### Example
 *
 * To update all dependencies in a module and commit the changes to git:
 *
 * ```ts
 * import { DependencyUpdate } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 * import { GitCommit } from "https://deno.land/x/molt@{VERSION}/git/mod.ts";
 *
 * const updates = await DependencyUpdate.collect("./mod.ts");
 * console.log(updates);
 *
 * // Commit all changes to git
 * const commits = GitCommit.sequence(updates, {
 *   groupBy: (dependency) => dependency.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 * GitCommit.execAll(commits);
 * ```
 *
 * @module
 */

export { DependencyUpdate } from "./src/update.ts";
export { FileUpdate } from "./src/file.ts";
