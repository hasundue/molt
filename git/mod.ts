// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

import { ModuleUpdateResult, writeAll } from "../mod.ts";
import { createVersionProp, VersionProp } from "./lib.ts";

export interface CommitProps {
  group: string;
  version?: VersionProp;
}

export interface CommitOptions {
  groupBy: (result: ModuleUpdateResult) => string;
  composeCommitMessage: (props: CommitProps) => string;
  gitAddOptions: string[];
  gitCommitOptions: string[];
}

export const defaultCommitOptions: CommitOptions = {
  groupBy: () => "dependencies",
  composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
  gitAddOptions: [],
  gitCommitOptions: [],
};

export async function commitAll(
  results: ModuleUpdateResult[],
  options: CommitOptions = defaultCommitOptions,
) {
  const groups = new Map<string, ModuleUpdateResult[]>();
  for (const result of results) {
    const key = options.groupBy(result);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(result);
  }
  for (const [group, results] of groups) {
    await writeAll(results);
    await addGroup(results, options.gitAddOptions);
    await commitGroup(
      {
        group,
        version: createVersionProp(results),
      },
      options.composeCommitMessage,
      options.gitCommitOptions,
    );
  }
}

export async function addGroup(
  results: ModuleUpdateResult[],
  options: string[],
) {
  const files = results.map((result) => result.specifier);
  const command = new Deno.Command("git", {
    args: ["add", ...options, ...files],
  });
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`git add failed: ${code}`);
  }
}

export async function commitGroup(
  props: CommitProps,
  composeCommitMessage: (props: CommitProps) => string,
  options: string[],
) {
  const message = composeCommitMessage(props);
  const command = new Deno.Command("git", {
    args: ["commit", ...options, "-m", message],
  });
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`git commit failed: ${code}`);
  }
}
