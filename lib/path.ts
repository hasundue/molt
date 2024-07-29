import { fromFileUrl, resolve, toFileUrl } from "@std/path";

/**
 * Convert a path to a string URL
 */
export function toUrl(path: string | URL): string {
  if (path instanceof URL) {
    return path.href;
  }
  // Exclude Windows paths like "C:\foo\bar"
  if (URL.canParse(path) && !path.match(/^[a-zA-Z]:/)) {
    return path;
  }
  // Assume the path is a relative path from the current working directory.
  return toFileUrl(resolve(path)).href;
}

/**
 * Convert a path to an absolute file path or a string URL.
 */
export function toPath(path: string | URL): string {
  if (path instanceof URL) {
    return path.protocol === "file:" ? fromFileUrl(path) : path.href;
  }
  if (URL.canParse(path)) {
    return path.startsWith("file:") ? fromFileUrl(path) : path;
  }
  return resolve(path);
}
