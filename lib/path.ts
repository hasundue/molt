import { relative } from "./std/path.ts";
import { dirname, join } from "./std/url.ts";

/**
 * Convert a path to a URL.
 */
export function toUrl(path: string | URL, cwd = Deno.cwd()): URL {
  if (path instanceof URL) {
    return path;
  }
  // If path represents a valid URL, wrap it in a URL and return it.
  try {
    return new URL(path);
  } catch {
    // Assume the path is a relative path from the current working directory.
    return join("file:///" + cwd, relative(cwd, path));
  }
}

/**
 * Recursively searches for a file with the specified name in parent directories
 * starting from the given entrypoint directory.
 *
 * @param entrypoint - The file URL to start the search from its parent dir.
 * @param files - The name of the files to search for.
 * @returns The first file path found or undefined if no file was found.
 */
export async function findFileUp(entrypoint: string | URL, ...files: string[]) {
  let url = toUrl(entrypoint);
  const info = await Deno.stat(url);
  if (!info.isDirectory) {
    url = dirname(url);
  }
  for (;;) {
    for await (const dirEntry of Deno.readDir(url)) {
      if (files.includes(dirEntry.name)) {
        return join(url, dirEntry.name);
      }
    }
    const newUrl = dirname(url);
    if (newUrl === url) {
      // reached the system root
      return undefined;
    }
    url = newUrl;
  }
}
