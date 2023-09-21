// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

import { ModuleUpdateResult } from "../mod.ts";
import { distinct } from "https://deno.land/std@0.202.0/collections/distinct.ts";
import { assert } from "https://deno.land/std@0.202.0/assert/mod.ts";

export interface CommitOptions {
  groupBy: (result: ModuleUpdateResult) => string;
  composeCommitMessage: (props: CommitProps) => string;
  gitAddOptions: string[];
  gitCommitOptions: string[];
}

export interface CommitProps {
  group: string;
  version?: {
    from?: string;
    to: string;
  };
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
    await addGroup(results, options.gitAddOptions);
    await commitGroup(
      {
        group,
        version: createVersionProps(results),
      },
      options.composeCommitMessage,
      options.gitCommitOptions,
    );
  }
}

async function addGroup(
  results: ModuleUpdateResult[],
  options: string[],
) {
  const files = results.map((result) => result.referrer);
  const command = new Deno.Command("git", {
    args: ["add", ...options, ...files],
  });
  const { code } = await command.output();
  if (code !== 0) {
    throw new Error(`git add failed: ${code}`);
  }
}

async function commitGroup(
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

function createVersionProps(
  resultGroup: ModuleUpdateResult[],
): CommitProps["version"] {
  const froms = distinct(resultGroup.map((result) => result.version.from));
  assert(froms.length > 0);
  const tos = distinct(resultGroup.map((result) => result.version.to));
  assert(tos.length === 1);
  return {
    from: distinct(froms).length === 1 ? froms[0] : undefined,
    to: tos[0],
  };
}
