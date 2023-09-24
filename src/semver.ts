import { type Maybe } from "./utils.ts";
import { Specifier } from "./core.ts";

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_REGEXP =
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
