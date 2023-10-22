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
 *   FileUpdate,
 * } from "https://deno.land/x/molt@{VERSION}/mod.ts";
 *
 * const updates = await DependencyUpdate.collect("./mod.ts", {
 *   importMap: "./deno.json",
 * });
 *
 * const results = await FileUpdate.collect(updates);
 * await FileUpdate.writeAll(results);
 * ```
 *
 * @module
 */

export { DependencyUpdate } from "./lib/update.ts";
export { FileUpdate } from "./lib/file.ts";
