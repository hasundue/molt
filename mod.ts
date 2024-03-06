// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to bump version strings in import specifiers.
 *
 * ### Examples
 *
 * To update all dependencies in a module and write the changes to files:
 *
 * ```ts
 * import { collect, write } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const result = await collect("./mod.ts");
 * await write(result);
 * ```
 *
 * To update all dependencies in a module and commit the changes to local git repository:
 *
 * ```ts
 * import { collect, commit } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const result = await collect("./mod.ts");
 *
 * await commit(result, {
 *   groupBy: (dependency) => dependency.name,
 *   composeCommitMessage: ({ group, version }) =>
 *     `build(deps): bump ${group} to ${version!.to}`,
 * });
 * ```
 *
 * @module
 */

export {
  type Dependency,
  parse,
  resolveLatestVersion,
  stringify,
  type UpdatedDependency,
} from "./lib/dependency.ts";

export { type FileUpdate, write, type WriteOptions } from "./lib/file.ts";

export {
  commit,
  type CommitSequence,
  createCommitSequence,
  execute,
  type GitCommit,
} from "./lib/git.ts";

export {
  collect,
  type CollectOptions,
  type CollectResult,
  type DependencyUpdate,
  type SourceType,
} from "./lib/update.ts";
