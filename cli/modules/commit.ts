import { type CollectResult, createCommitSequence, execute } from "@molt/core";
import { runTask, type TaskRecord } from "./tasks.ts";

const formatPrefix = (prefix: string | undefined) =>
  prefix ? prefix.trimEnd() + " " : "";

export default async function (
  result: CollectResult,
  options: {
    preCommit?: TaskRecord;
    postCommit?: TaskRecord;
    prefix?: string;
    prefixLock?: string;
  },
) {
  console.log();

  const preCommitTasks = Object.entries(options?.preCommit ?? {});
  const postCommitTasks = Object.entries(options?.postCommit ?? {});
  const hasTask = preCommitTasks.length > 0 || postCommitTasks.length > 0;

  let count = 0;
  const commits = createCommitSequence(result, {
    groupBy: (dependency) => dependency.to.name,
    composeCommitMessage: ({ group, types, version }) =>
      formatPrefix(
        types.length === 1 && types.includes("lockfile")
          ? options.prefixLock
          : options.prefix,
      ) + `bump ${group}` +
      (version?.from ? ` from ${version?.from}` : "") +
      (version?.to ? ` to ${version?.to}` : ""),
    preCommit: preCommitTasks.length > 0
      ? async (commit) => {
        console.log(`💾 ${commit.message}`);
        for (const t of preCommitTasks) {
          await runTask(t);
        }
      }
      : undefined,
    postCommit: async (commit) => {
      console.log(`📝 ${commit.message}`);
      for (const task of postCommitTasks) {
        await runTask(task);
      }
      if (hasTask && ++count < commits.commits.length) {
        console.log();
      }
    },
  });
  await execute(commits);
}
