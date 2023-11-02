import { createVersionProp, DependencyUpdate, VersionProp } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { URI } from "./uri.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionProp;
}

export interface CommitOptions {
  groupBy?: (dependency: DependencyUpdate) => string;
  composeCommitMessage?: (props: CommitProps) => string;
  preCommit?: (commit: GitCommit) => void | Promise<void>;
  postCommit?: (commit: GitCommit) => void | Promise<void>;
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
  exec: execGitCommit,
};

export interface GitCommitSequence {
  commits: GitCommit[];
  options: CommitOptions;
}

export const GitCommitSequence = {
  from: createGitCommitSequence,
  exec: execGitCommitSequence,
};

export function commitAll(
  updates: DependencyUpdate[],
  options?: CommitOptions,
) {
  return execGitCommitSequence(
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
  const commits: GitCommit[] = Array.from(groups.entries()).map((
    [group, updates],
  ) => {
    const version = createVersionProp(updates);
    return ({
      group,
      version,
      message: _options.composeCommitMessage({ group, version }),
      updates,
    });
  });
  return { commits, options: _options };
}

async function execGitCommitSequence(
  sequence: GitCommitSequence,
) {
  for (const commit of sequence.commits) {
    await execGitCommit(commit, sequence.options);
  }
}

async function execGitCommit(
  commit: GitCommit,
  options?: CommitOptions,
) {
  const results = FileUpdate.collect(commit.updates);
  await FileUpdate.writeAll(results);
  await options?.preCommit?.(commit);
  await _add(results, options?.gitAddOptions ?? []);
  await _commit(commit.message, options?.gitCommitOptions ?? []);
  await options?.postCommit?.(commit);
}

async function _add(
  results: FileUpdate[],
  options: string[],
) {
  const files = results.map((result) => URI.relative(result.specifier));
  const { code, stderr } = await new Deno.Command("git", {
    args: ["add", ...options, ...files],
  }).output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr));
  }
}

async function _commit(
  message: string,
  options: string[],
) {
  const { code, stderr } = await new Deno.Command("git", {
    args: ["commit", ...options, "-m", message],
  }).output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr));
  }
}
