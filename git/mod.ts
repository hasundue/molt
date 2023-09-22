// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

import {
  type DependencyUpdate,
  execAll,
  type ModuleUpdateResult,
  writeAll,
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

export function commitAll(
  updates: DependencyUpdate[],
  options?: Partial<CommitOptions>,
) {
  const {
    groupBy,
    composeCommitMessage,
    gitAddOptions,
    gitCommitOptions,
  } = { ...defaultCommitOptions, ...options };
  const groups = new Map<string, DependencyUpdate[]>();
  for (const u of updates) {
    const key = groupBy(u);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(u);
  }
  for (const [group, updates] of groups) {
    const results = execAll(updates);
    writeAll(results);
    addGroup(results, gitAddOptions);
    commitGroup(
      {
        group,
        version: createVersionProp(results),
      },
      composeCommitMessage,
      gitCommitOptions,
    );
  }
}

function addGroup(
  results: ModuleUpdateResult[],
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

function commitGroup(
  props: CommitProps,
  composeCommitMessage: (props: CommitProps) => string,
  options: string[],
) {
  const message = composeCommitMessage(props);
  const command = new Deno.Command("git", {
    args: ["commit", ...options, "-m", `"${message}"`],
  });
  const { code } = command.outputSync();
  if (code !== 0) {
    throw new Error(`git commit failed: ${code}`);
  }
}
