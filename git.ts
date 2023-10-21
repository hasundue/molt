// Copyright 2023 Chiezo (Shun Ueda). All rights reserved. MIT license.

/**
 * A sub module of molt for git operations.
 *
 * ### Example
 *
 * To update all dependencies in a module and commit the changes to git:
 *
 * ```ts
 * import { DependencyUpdate } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 * import { commitAll } from "https://deno.land/x/molt@{VERSION}/git.ts";
 *
 * const updates = await DependencyUpdate.collect("./mod.ts");
 *
 * commitAll(updates, {
 *   groupBy: (dependency) => dependency.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 * ```
 *
 * @module
 */

export * from "./src/git.ts";
