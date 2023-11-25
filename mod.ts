// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to update dependencies in Deno projects using deno_graph.
 *
 * ### Examples
 *
 * To update all dependencies in a module and write the changes to files:
 *
 * ```ts
 * import { collect, writeAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const updates = await collect("./mod.ts");
 * await writeAll(updates);
 * ```
 *
 * To update all dependencies in a module and commit the changes to local git repository:
 *
 * ```ts
 * import { collect, commitAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const updates = await collect("./mod.ts");
 *
 * await commitAll(updates, {
 *   groupBy: (dependency) => dependency.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 * ```
 *
 * @module
 */

export * from "./lib/update.ts";
export * from "./lib/file.ts";
export * from "./lib/git.ts";
export * from "./lib/dependency.ts";
