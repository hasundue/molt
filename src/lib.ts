import {
  format,
  parse,
  type SemVer,
} from "https://deno.land/std@0.202.0/semver/mod.ts";

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

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
export const SEMVER_REGEXP =
  /@v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

export function removeSemVer(specifier: string | Specifier) {
  return specifier.replaceAll(SEMVER_REGEXP, "") as Specifier;
}

export function parseSemVer(specifier: string | Specifier): Maybe<SemVer> {
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
  return parse(match[0].replace("@", ""));
}

export function replaceSemVer(
  specifier: string | Specifier,
  newSemVer: string | SemVer,
): string {
  const semver = parseSemVer(specifier);
  if (!semver) {
    return specifier;
  }
  // Parse as a semver to strip off any leading `v` and normalize it.
  newSemVer = parse(newSemVer);
  return specifier.replace(format(semver), format(newSemVer));
}

type NpmSpecifierJson = {
  name: string;
  version: string;
  subpath?: string;
};

export function parseNpmSpecifier(specifier: string): NpmSpecifierJson {
  const body = specifier.replace(/^npm:/, "");
  const [nameAndVersion, subpath] = body.split("/", 2);
  const [name, version] = nameAndVersion.split("@");
  return { name, version, subpath };
}

export const log = {
  debug: Deno.env.get("CI") ? () => {} : globalThis.console.debug,
};
