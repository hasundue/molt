import {
  isAbsolute,
  relative,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import type {
  Path,
  FileUri,
  Maybe,
  Url,
  Uri,
} from "./types.ts";

export function tryCreateUrl(specifier: string): Maybe<URL> {
  try {
    return new URL(specifier);
  } catch {
    return undefined;
  }
}

export function toRelative(path: Path) {
  return relative(Deno.cwd(), path) as Path;
}

export function toFileUri(path: Path) {
  return toFileUrl(
    isAbsolute(path) ? path : resolve(path),
  ).href as FileUri;
}

export function isFileUri(
  specifier: string,
): specifier is FileUri {
  return specifier.startsWith("file:///");
}

export function assertFileUri(str: string): asserts str is FileUri {
  if (!isFileUri(str)) {
    throw new TypeError(`Invalid file URI: ${str}`);
  }
}

export function toRelativePath(specifier: FileUri) {
  return toRelative(
    new URL(specifier).pathname as Path,
  ) as Path;
}

export function toArray<T>(
  arg: T | T[],
): T[] {
  return Array.isArray(arg) ? arg : [arg];
}

export function isUrl(str: string): str is Url {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function ensureUri(str: string): Uri {
  try {
    return new URL(str).href as Uri;
  } catch {
    throw new TypeError(`Invalid URI: ${str}`);
  }
}

export function ensurePath(str: string): Path {
  if (isUrl(str)) {
    throw new TypeError(`Invalid file path: ${str}`);
  }
  try {
    toFileUrl(resolve(str));
    return str as Path;
  } catch {
    throw new TypeError(`Invalid file path: ${str}`);
  }
}
