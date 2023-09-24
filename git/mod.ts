// Copyright 2023 Chiezo (Shun Ueda). All rights reserved. MIT license.

import {
  type DependencyUpdate,
  execDependencyUpdateAll,
  type ModuleContentUpdate,
  writeModuleContentUpdateAll,
} from "../mod.ts";
import { createVersionProp, type VersionProp } from "../src/versions.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionProp;
}

export interface CommitOptions {
  groupBy: (dependency: DependencyUpdate) => string;
  composeCommitMessage: (props: CommitProps) => string;
  gitAddOptions: string[];
  gitCommitOptions: string[];
}

export const defaultCommitOptions: CommitOptions = {
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
};

export interface GitCommit {
  message: string;
  updates: DependencyUpdate[];
}

export interface GitCommitSequence {
  commits: GitCommit[];
  options: CommitOptions;
}

export interface ExecGitCommitSequenceOptions {
  onCommit?: (commit: GitCommit) => void;
}

export function commitDependencyUpdateAll(
  updates: DependencyUpdate[],
  options?: Partial<CommitOptions> & ExecGitCommitSequenceOptions,
): void {
  execGitCommitSequence(
    createGitCommitSequence(updates, options),
    options,
  );
}

export function createGitCommitSequence(
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
  const commits: GitCommit[] = Array.from(groups.entries()).map((
    [group, updates],
  ) => ({
    message: _options.composeCommitMessage({
      group,
      version: createVersionProp(updates),
    }),
    updates,
  }));
  return { commits, options: _options };
}

export function execGitCommitSequence(
  sequence: GitCommitSequence,
  options: ExecGitCommitSequenceOptions = {},
) {
  sequence.commits.forEach((it) => {
    execGitCommit(it, sequence.options);
    options.onCommit?.(it);
  });
}

export function execGitCommit(
  commit: GitCommit,
  options: CommitOptions,
) {
  const results = execDependencyUpdateAll(commit.updates);
  writeModuleContentUpdateAll(results);
  _add(results, options.gitAddOptions);
  _commit(commit.message, options.gitCommitOptions);
}

function _add(
  results: ModuleContentUpdate[],
  options: string[],
) {
  const files = results.map((result) => result.specifier);
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
    args: ["commit", ...options, "-m", `"${message}"`],
  });
  const { code } = command.outputSync();
  if (code !== 0) {
    throw new Error(`git commit failed: ${code}`);
  }
}
