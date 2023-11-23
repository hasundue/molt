// Copyright 2023 Shun Ueda. All rights reserved. MIT license.

/**
 * A module to update dependencies in Deno projects using deno_graph.
 *
 * ### Example
 *
 * To update all dependencies in a module and write the changes to local files:
 *
 * ```ts
 * import {
 *   DependencyUpdate,
 *   writeAll,
 * } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const updates = await DependencyUpdate.collect("./mod.ts", {
 *   importMap: "./deno.json",
 * });
 *
 * await writeAll(updates);
 * ```
 *
 * @module
 */

export { DependencyUpdate } from "./lib/update.ts";
export { FileUpdate, writeAll } from "./lib/file.ts";
export type { Dependency, UpdatedDependency } from "./lib/dependency.ts";
export type { SemVerString } from "./lib/semver.ts";
export type { ImportMap } from "./lib/import_map.ts";
export type { URI } from "./lib/uri.ts";
export type { Path } from "./lib/types.ts";
