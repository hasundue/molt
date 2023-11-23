import { parse as parseSemVer } from "./std/semver.ts";
import { Opaque } from "./npm/type-fest.ts";

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_REGEXP =
  /v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

/** A string that represents a semver (e.g. `v1.0.0`.) */
export type SemVerString = Opaque<string, "SemVerString">;

// deno-lint-ignore no-namespace
export namespace SemVerString {
  /**
   * Parse a semver string from the given string.
   *
   * @param from - The string to parse.
   *
   * @returns The parsed semver string, or `undefined` if no valid semver string is found.
   *
   * @example
   * ```ts
   * SemVerString.extract("https://deno.land/std@0.205.0/version.ts");
   * // -> "0.205.0"
   * ```
   */
  export function extract(from: string): SemVerString | undefined {
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
    return match[0] as SemVerString;
  }

  /**
   * Check if the given semver string represents a pre-release.
   * @example
   * ```ts
   * new SemVerString("0.1.0").isPreRelease(); // -> false
   * new SemVerString("0.1.0-alpha.1").isPreRelease(); // -> true
   * ```
   */
  export function isPreRelease(semver: SemVerString): boolean {
    const parsed = parseSemVer(semver);
    if (!parsed) {
      throw new TypeError(`Invalid semver: ${semver}`);
    }
    return parsed.prerelease.length > 0;
  }
}
