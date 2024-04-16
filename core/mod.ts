// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to bump version strings in import specifiers.
 *
 * ### Examples
 *
 * To update all dependencies in a module and write the changes to files:
 *
 * ```ts
 * import { collect, write } from "jsr:@molt/core@{VERSION}";
 *
 * const result = await collect("./mod.ts");
 * await write(result);
 * ```
 *
 * To update all dependencies in a module and commit the changes to local git repository:
 *
 * ```ts
 * import { collect, commit } from "jsr:@molt/core@{VERSION}";
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
} from "./dependency.ts";

export {
  associateByFile,
  type FileUpdate,
  write,
  type WriteOptions,
} from "./file.ts";

export {
  commit,
  type CommitSequence,
  createCommitSequence,
  execute,
  type GitCommit,
} from "./git.ts";

export {
  collect,
  type CollectOptions,
  type CollectResult,
  type DependencyUpdate,
  type SourceType,
} from "./update.ts";
