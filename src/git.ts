import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { createVersionProp, type VersionProp } from "./versions.ts";
import { URI } from "../lib/uri.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionProp;
}

export interface CommitOptions {
  groupBy?: (dependency: DependencyUpdate) => string;
  composeCommitMessage?: (props: CommitProps) => string;
  preCommit?: (commit: GitCommit) => void;
  postCommit?: (commit: GitCommit) => void;
  gitAddOptions?: string[];
  gitCommitOptions?: string[];
}

const defaultCommitOptions = {
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

export function commitAll(
  updates: DependencyUpdate[],
  options?: CommitOptions,
): void {
  execGitCommitSequence(
    createGitCommitSequence(updates, {
      ...defaultCommitOptions,
      ...options,
    }),
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
) {
  for (const commit of sequence.commits) {
    execGitCommit(commit, sequence.options);
  }
}

function execGitCommit(
  commit: GitCommit,
  options?: CommitOptions,
) {
  const results = FileUpdate.collect(commit.updates);
  FileUpdate.writeAll(results);
  options?.preCommit?.(commit);
  _add(results, options?.gitAddOptions ?? []);
  _commit(commit.message, options?.gitCommitOptions ?? []);
  options?.postCommit?.(commit);
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
