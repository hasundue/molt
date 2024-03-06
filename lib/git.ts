import { distinct, mapN } from "./std/collections.ts";
import { relative } from "./std/path.ts";
import {
  associateByFile,
  type FileUpdate,
  writeFileUpdate,
  WriteOptions,
} from "./file.ts";
import { LockPart } from "./lockfile.ts";
import { CollectResult, DependencyUpdate } from "./update.ts";

export interface CommitProps {
  /** The name of the module group */
  group: string;
  version?: VersionChange;
}

export interface GitCommit extends CommitProps {
  message: string;
  updates: DependencyUpdate[];
  locks: LockPart[];
}

export interface CommitSequence {
  commits: GitCommit[];
  options: CommitOptions;
}

export interface CommitOptions extends WriteOptions {
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

/**
 * Write the given `CollectResult` to file system.
 * @returns A promise that resolves when all updates are committed.
 */
export function commit(
  result: CollectResult,
  options?: CommitOptions,
) {
  return execute(createCommitSequence(result, {
    ...defaultCommitOptions,
    ...options,
  }));
}

/**
 * Create a sequence of commits from the given `CollectResult`.
 */
export function createCommitSequence(
  result: CollectResult,
  options?: CommitOptions,
): CommitSequence {
  const _options = { ...defaultCommitOptions, ...options };
  const groups = new Map<string, DependencyUpdate[]>();
  for (const u of result.updates) {
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
      locks: result.locks,
    });
  }).sort((a, b) => a.group.localeCompare(b.group));
  return { commits, options: _options };
}

export function execute(
  commit: GitCommit,
  options?: CommitOptions,
): Promise<void>;
export function execute(sequence: CommitSequence): Promise<void>;

export function execute(
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
  const results = associateByFile(commit);
  await writeFileUpdate(results);
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

export type VersionChange = {
  from?: string;
  to: string;
};

export function getVersionChange(
  dependencies: DependencyUpdate[],
): VersionChange | undefined {
  const modules = distinct(dependencies.map((d) => d.to.name));
  if (modules.length > 1) {
    // Cannot provide a well-defined version prop
    return;
  }
  const tos = distinct(dependencies.map((d) => d.to.version));
  if (tos.length > 1) {
    throw new Error(
      "Multiple target versions are specified for a single module",
    );
  }
  const froms = distinct(mapN(dependencies, (d) => d.from?.version));
  return {
    from: froms.length === 1 ? froms[0] : undefined,
    to: tos[0],
  };
}
