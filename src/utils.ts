import { relative } from "https://deno.land/std@0.202.0/path/mod.ts";

export type Brand<T, B> = T & { __brand: B };
export type Specifier = Brand<string, "specifier">;

export type Maybe<T> = T | undefined;

export function createUrl(specifier: string): Maybe<URL> {
  try {
    return new URL(specifier);
  } catch {
    return;
  }
}

export function relativeFromCwd(path: string) {
  return relative(Deno.cwd(), path);
}

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
export const SEMVER_REGEXP =
  /@v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

export function parseSemVer(specifier: string | Specifier): Maybe<string> {
  const match = specifier.match(SEMVER_REGEXP);
  if (!match) {
    return;
  }
  if (match.length > 1) {
    console.warn(
      "Multiple semvers in a single specifier is not supported:",
      specifier,
    );
    return;
  }
  return match[0].slice(1);
}

export const log = {
  debug: Deno.env.get("CI") ? () => {} : globalThis.console.debug,
};
