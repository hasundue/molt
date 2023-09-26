import {
  isAbsolute,
  relative,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import type {
  FilePath,
  FileSpecifier,
  Maybe,
  ModuleSpecifier,
  RelativePath,
  UrlSpecifier,
  UrlString,
} from "./types.ts";

export function tryCreateUrl(specifier: string): Maybe<URL> {
  try {
    return new URL(specifier);
  } catch {
    return undefined;
  }
}

export function ensureRelative(path: FilePath) {
  return relative(Deno.cwd(), path) as RelativePath;
}

export function toFileSpecifier(path: FilePath) {
  return toFileUrl(
    isAbsolute(path) ? path : resolve(path),
  ).href as FileSpecifier;
}

export function isFileSpecifier(
  specifier: ModuleSpecifier,
): specifier is FileSpecifier {
  return specifier.startsWith("file:///");
}

export function toRelativePath(specifier: FileSpecifier) {
  return ensureRelative(
    new URL(specifier).pathname as FilePath,
  ) as RelativePath;
}

export function toUrlString(specifier: UrlSpecifier) {
  return new URL(specifier).href as UrlString;
}

export function ensureArray<T>(
  arg: T | T[],
): T[] {
  return Array.isArray(arg) ? arg : [arg];
}

export function isUrlString(str: string): str is UrlString {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export function ensureFilePath(str: string): FilePath {
  if (isUrlString(str)) {
    throw new TypeError(`Invalid file path: ${str}`);
  }
  try {
    toFileUrl(resolve(str));
    return str as FilePath;
  } catch {
    throw new TypeError(`Invalid file path: ${str}`);
  }
}
