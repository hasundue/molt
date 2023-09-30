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
 * import { commitAll } from "https://deno.land/x/molt@{VERSION}/git/mod.ts";
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

import { DependencyUpdate } from "../src/update.ts";
import { FileUpdate } from "../src/file.ts";
import { createVersionProp, type VersionProp } from "../src/versions.ts";
import { URI } from "../lib/uri.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionProp;
}

export interface CommitOptions {
  groupBy?: (dependency: DependencyUpdate) => string;
  composeCommitMessage?: (props: CommitProps) => string;
  gitAddOptions?: string[];
  gitCommitOptions?: string[];
}

export const defaultCommitOptions = {
  groupBy: () => "dependencies",
  composeCommitMessage: ({ group, version }) => {
    let message = `build(deps): update ${group}`;
    if (version?.from) {
      message += ` from ${version.from}`;
    }
    if (version?.to) {
      message += ` to ${version.to}`;
    }
    return message;
  },
  gitAddOptions: [],
  gitCommitOptions: [],
} satisfies CommitOptions;

export interface GitCommit extends CommitProps {
  message: string;
  updates: DependencyUpdate[];
}

export const GitCommit = {
  sequence: createGitCommitSequence,
  exec: execGitCommit,
  execAll: execGitCommitSequence,
};

export interface GitCommitSequence {
  commits: GitCommit[];
  options: CommitOptions;
}

export interface ExecGitCommitSequenceOptions {
  preCommit?: (commit: GitCommit) => void;
  postCommit?: (commit: GitCommit) => void;
}

export function commitAll(
  updates: DependencyUpdate[],
  options?: CommitOptions & ExecGitCommitSequenceOptions,
): void {
  execGitCommitSequence(
    createGitCommitSequence(updates, options),
    options,
  );
}

function createGitCommitSequence(
  updates: DependencyUpdate[],
  options?: Partial<CommitOptions>,
): GitCommitSequence {
  const _options = { ...defaultCommitOptions, ...options };
  const groups = new Map<string, DependencyUpdate[]>();
  for (const u of updates) {
    const key = _options.groupBy(u);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(u);
  }
  const version = createVersionProp(updates);
  const commits: GitCommit[] = Array.from(groups.entries()).map((
    [group, updates],
  ) => ({
    group,
    version,
    message: _options.composeCommitMessage({ group, version }),
    updates,
  }));
  return { commits, options: _options };
}

function execGitCommitSequence(
  sequence: GitCommitSequence,
  options?: ExecGitCommitSequenceOptions,
) {
  for (const commit of sequence.commits) {
    options?.preCommit?.(commit);
    execGitCommit(commit, sequence.options);
    options?.postCommit?.(commit);
  }
}

function execGitCommit(
  commit: GitCommit,
  options?: CommitOptions,
) {
  const results = FileUpdate.collect(commit.updates);
  FileUpdate.writeAll(results);
  _add(results, options?.gitAddOptions ?? []);
  _commit(commit.message, options?.gitCommitOptions ?? []);
}

function _add(
  results: FileUpdate[],
  options: string[],
) {
  const files = results.map((result) => URI.relative(result.specifier));
  const command = new Deno.Command("git", {
    args: ["add", ...options, ...files],
  });
  const { code } = command.outputSync();
  if (code !== 0) {
    throw new Error(`git add failed: ${code}`);
  }
}

function _commit(
  message: string,
  options: string[],
) {
  const command = new Deno.Command("git", {
    args: ["commit", ...options, "-m", message],
  });
  const { code } = command.outputSync();
  if (code !== 0) {
    throw new Error(`git commit failed: ${code}`);
  }
}
