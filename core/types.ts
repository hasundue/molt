import type { DependencyKind } from "./specs.ts";

export type { DependencyBump } from "./bumps.ts";
export type { LockfileJson } from "./locks.ts";
export type { DependencyRef } from "./refs.ts";
export type { DependencyKind, DependencySpec } from "./specs.ts";
export type { DependencyState, DependencyUpdate } from "./updates.ts";

export interface Dependency {
  /** The specifier of a dependency. @example "jsr:@molt/core" */
  specifier: string;

  /** The kind of the dependency. */
  kind: DependencyKind;

  /** The name of the dependency. @example "@molt/core" */
  name: string;

  /** The paths to the files that import the dependency. */
  refs: string[];

  check(): Promise<Update | undefined>;
}

export interface VersionBump {
  from: string;
  to: string;
}

export interface Update {
  dep: Dependency;

  constraint?: VersionBump;
  lock?: VersionBump;

  write(): Promise<void>;
  commit(): Promise<string>;
  summary(prefix?: string): string;
}
