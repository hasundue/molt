import {
  type ConventionalChangelogCommit as Commit,
  parser,
  toConventionalChangelogFormat,
} from "@conventional-commits/parser";
import { associateWith, mapNotNullish } from "@std/collections";

export type { Commit };

export type ChangeLog<
  T extends string = string,
> = {
  [K in T | "BREAKING CHANGE"]: ChangeLogRecord[];
};

export interface ChangeLogRecord {
  scope: string | null;
  text: string;
}

export interface ChangeLogOptions<
  T extends string = string,
> {
  types: T[];
  scope?: string;
}

export function curateChangeLog<
  T extends string = string,
>(
  messages: string[],
  options: ChangeLogOptions<T>,
): ChangeLog<T> {
  const { scope, types } = options;
  let commits = mapNotNullish(messages, tryParseCommit);
  if (scope) {
    commits = commits
      .filter((it) => it.scope?.startsWith(scope))
      .map((it): Commit => ({ ...it, scope: flatten(it.scope, scope) }));
  }
  return {
    ...associateWith(
      types,
      (type) =>
        commits
          .filter((it) => it.type === type)
          .map((it): ChangeLogRecord => ({
            scope: it.scope,
            text: it.subject,
          })),
    ),
    "BREAKING CHANGE": commits
      .flatMap(curateBreakingChange)
      .map((it): ChangeLogRecord => ({ scope: null, text: it })),
  } as ChangeLog<T>;
}

function flatten(scope: string | null, root?: string): string | null {
  if (!scope) {
    return null;
  }
  if (!root) {
    return scope;
  }
  const sliced = scope.slice(root.length);
  return sliced.length ? sliced : null;
}

export function tryParseCommit(message: string): Commit | undefined {
  try {
    return toConventionalChangelogFormat(parser(message));
  } catch {
    return undefined;
  }
}

export function parseCommit(message: string): Commit {
  return toConventionalChangelogFormat(parser(message));
}

export function curateBreakingChange(commit: Commit): string[] {
  return commit.notes
    .filter((note) => note.title === "BREAKING CHANGE")
    .map((note) => note.text);
}
