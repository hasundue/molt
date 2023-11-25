import { parse } from "./std/semver.ts";

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_REGEXP =
  /v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

/**
 * Parse a SemVer string from the given string.
 *
 * @param from - The string to parse.
 * @returns The parsed semver string, or `undefined` if no valid semver string is found.
 *
 * @example
 * ```ts
 * extract("https://deno.land/std@0.205.0/version.ts");
 * // -> "0.205.0"
 * ```
 */
export function extract(from: string): string | undefined {
  const match = from.match(SEMVER_REGEXP);
  if (!match) {
    return undefined;
  }
  if (match.length > 1) {
    console.warn(
      "Multiple semvers in a single specifier is not supported:",
      from,
    );
    return undefined;
  }
  return match[0];
}

/**
 * Check if the given SemVer string represents a pre-release.
 *
 * @example
 * ```ts
 * isPreRelease("0.1.0"); // -> false
 * isPreRelease("0.1.0-alpha.1"); // -> true
 * ```
 */
export function isPreRelease(semver: string): boolean {
  const parsed = parse(semver);
  if (!parsed) {
    throw new TypeError(`Invalid SemVer: ${semver}`);
  }
  return parsed.prerelease.length > 0;
}
