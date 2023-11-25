import { relative } from "./std/path.ts";
import {
  type DependencyUpdate,
  getVersionChange,
  VersionChange,
} from "./update.ts";
import { associateByFile, type FileUpdate, write } from "./file.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionChange;
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

export interface CommitSequence {
  commits: GitCommit[];
  options: CommitOptions;
}

export function commitAll(
  updates: DependencyUpdate[],
  options?: CommitOptions,
) {
  return execCommitSequence(
    createCommitSequence(updates, {
      ...defaultCommitOptions,
      ...options,
    }),
  );
}

export function createCommitSequence(
  updates: DependencyUpdate[],
  options?: Partial<CommitOptions>,
): CommitSequence {
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
    const version = getVersionChange(updates);
    return ({
      group,
      version,
      message: _options.composeCommitMessage({ group, version }),
      updates,
    });
  }).sort((a, b) => a.group.localeCompare(b.group));
  return { commits, options: _options };
}

export function exec(commit: GitCommit, options?: CommitOptions): Promise<void>;
export function exec(sequence: CommitSequence): Promise<void>;

export function exec(
  commit: GitCommit | CommitSequence,
  options?: CommitOptions,
): Promise<void> {
  if ("commits" in commit) {
    return execCommitSequence(commit);
  }
  return execCommit(commit, options);
}

async function execCommitSequence(
  sequence: CommitSequence,
) {
  for (const commit of sequence.commits) {
    await execCommit(commit, sequence.options);
  }
}

async function execCommit(
  commit: GitCommit,
  options?: CommitOptions,
) {
  const results = associateByFile(commit.updates);
  await write(results);
  await options?.preCommit?.(commit);
  await addCommand(results, options?.gitAddOptions ?? []);
  await commitCommand(commit.message, options?.gitCommitOptions ?? []);
  await options?.postCommit?.(commit);
}

async function addCommand(
  results: FileUpdate[],
  options: string[],
) {
  const files = results.map((result) => relative(Deno.cwd(), result.path));
  const { code, stderr } = await new Deno.Command("git", {
    args: ["add", ...options, ...files],
  }).output();
  if (code !== 0) {
    throw new Error(new TextDecoder().decode(stderr));
  }
}

async function commitCommand(
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
