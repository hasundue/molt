import { dirname, join, resolve } from "./std/path.ts";

/**
 * Convert a path to a string URL
 */
export function toUrl(path: string | URL): string {
  if (path instanceof URL) {
    return path.href;
  }
  if (URL.canParse(path)) {
    return path;
  }
  // Assume the path is a relative path from the current working directory.
  return "file://" + resolve(path);
}

/**
 * Convert a path to an absolute file path or a string URL.
 */
export function toPath(path: string | URL): string {
  if (path instanceof URL) {
    return path.protocol === "file:" ? path.pathname : path.href;
  }
  if (URL.canParse(path)) {
    return path.startsWith("file://") ? path.slice(7) : path;
  }
  return resolve(path);
}

/**
 * Recursively searches for file(s) with the specified name in parent directories
 * starting from the given starting directory.
 *
 * @param dir - The path to the directory to start searching from.
 * @param files - The name of the files to search for.
 * @returns The first file path found or undefined if no file was found.
 */
export async function findFileUp(dir: string | URL, ...files: string[]) {
  dir = toPath(dir);
  for (;;) {
    for await (const dirEntry of Deno.readDir(dir)) {
      if (files.includes(dirEntry.name)) {
        return join(dir, dirEntry.name);
      }
    }
    const newDir = dirname(dir);
    if (newDir === dir) {
      // reached the system root
      return undefined;
    }
    dir = newDir;
  }
}
