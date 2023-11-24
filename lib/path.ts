import { assertEquals } from "./std/assert.ts";
import { join, dirname } from "./std/path.ts";

/**
 * Recursively searches for a file with the specified name in parent directories
 * starting from the given entrypoint directory.
 *
 * @param entrypoint - The path to the file to start the search from its parent dir.
 * @param files - The name of the files to search for.
 * @returns The first file path found or undefined if no file was found.
 */
export async function findFileUp(entrypoint: string | URL, ...files: string[]) {
  if (entrypoint instanceof URL) {
    assertEquals(entrypoint.protocol, "file:");
  }
  let path = entrypoint instanceof URL ? entrypoint.pathname : entrypoint;

  try {
    path = (await Deno.stat(path)).isFile ? dirname(path) : path;
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      throw new TypeError(`Invalid format of an entrypoint path: ${entrypoint}`);
    }
    throw e;
  }

  for (;;) {
    for await (const dirEntry of Deno.readDir(path)) {
      if (files.includes(dirEntry.name)) {
        return join(path, dirEntry.name);
      }
    }
    const newPath = dirname(path);
    if (newPath === path) {
      // reached the system root
      return undefined;
    }
    path = newPath;
  }
}
