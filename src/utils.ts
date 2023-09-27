import {
  isAbsolute,
  relative,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import type { FileUri, Maybe, Path, Uri, Url } from "./types.ts";

export interface CatchMe<R> {
  catch: <S>(you: (exception: unknown) => S) => R | S;
  catchWith: <S>(yours: S) => R | S;
}

export function isCatchMe<R>(
  arg: unknown,
): arg is CatchMe<R> {
  return typeof arg === "object" &&
    arg !== null &&
    "catch" in arg &&
    "catchWith" in arg;
}

export function catchMe<R>(me: () => R): CatchMe<R> {
  return {
    catch: <S>(you: (exception: unknown) => S) => {
      try {
        return me();
      } catch (e) {
        return you(e);
      }
    },
    catchWith: <S>(yours: S) => {
      try {
        return me();
      } catch {
        return yours;
      }
    },
  };
}

// deno-lint-ignore no-explicit-any
export function sayCatchMe<T extends any[], R>(
  me: (...args: T) => R,
): (...args: T) => CatchMe<R> {
  return (...args: T) => {
    return {
      catch: <S>(you: (exception: unknown) => S) => {
        try {
          return me(...args);
        } catch (e) {
          return you(e);
        }
      },
      catchWith: <S>(yours: S) => {
        try {
          return me(...args);
        } catch {
          return yours;
        }
      },
    };
  };
}

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
