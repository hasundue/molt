import { match, placeholder as _ } from "@core/match";
import type { DependencySpec } from "@molt/core/specs";
import * as Spec from "@molt/core/specs";
import { getTags, type Repository } from "./repository.ts";
import * as github from "./github.ts";
import { equals, parse as SemVer } from "@std/semver";

/**
 * A known package registry.
 */
export type KnownPackageRegistry = typeof KNOWN_PACKAGE_REGISTRIES[number];

const KNOWN_PACKAGE_REGISTRIES = [
  "jsr",
] as const;

/**
 * Check if a string is a known package registry.
 */
export function isKnownRegistry(str: unknown): str is KnownPackageRegistry {
  return typeof str === "string" &&
    KNOWN_PACKAGE_REGISTRIES.includes(str as KnownPackageRegistry);
}

/**
 * A package in a package registry.
 */
export interface Package<
  R extends KnownPackageRegistry = KnownPackageRegistry,
> {
  registry: R;
  scope: string;
  name: string;
}

/**
 * A string representation of a package in a package registry.
 *
 * @example
 * ```ts
 * const pkg = { registry: "jsr", scope: "molt", name: "core" };
 * stringify(pkg); // "jsr:@molt/core"
 * ```
 */
export type PackageString<
  R extends KnownPackageRegistry = KnownPackageRegistry,
> = `${R}:@${string}/${string}`;

/**
 * Convert a package to a string representation.
 *
 * @example
 * ```ts
 * const pkg = { registry: "jsr", scope: "molt", name: "core" };
 * stringify(pkg); // "jsr:@molt/core"
 * ```
 */
export function stringify<R extends KnownPackageRegistry>(
  pkg: Package<R>,
): PackageString<R> {
  return `${pkg.registry}:@${pkg.scope}/${pkg.name}`;
}

/**
 * Parse a package from a string representation.
 * If the string is not a valid package, an error is thrown.
 *
 * @example
 * ```ts
 * parse("jsr:@molt/core"); // { registry: "jsr", scope: "molt", name: "core" }
 * ```
 */
export function parse<T extends string>(
  str: T,
): T extends PackageString<infer R> ? Package<R> : Package {
  const result = match(
    _`${_("registry", isKnownRegistry)}:@${_("scope")}/${_("name")}`,
    str,
  );
  if (!result) {
    throw new Error(`Invalid package specifier: ${str}`);
  }
  // deno-lint-ignore no-explicit-any
  return result as any;
}

/**
 * Try to parse a package from a string representation.
 * If the string is not a valid package, `undefined` is returned.
 *
 * @example
 * ```ts
 * tryParse("jsr:@molt/core"); // { registry: "jsr", scope: "molt", name: "core" }
 *
 * tryParse("invalid"); // undefined
 * ```
 */
export function tryParse<T extends string>(
  str: T,
): T extends PackageString<infer R> ? Package<R> : Package | undefined {
  try {
    // deno-lint-ignore no-explicit-any
    return parse(str) as any;
  } catch {
    // deno-lint-ignore no-explicit-any
    return undefined as any;
  }
}

/**
 * Check if a string represents the given package.
 *
 * @example
 * ```ts
 * const pkg = { registry: "jsr", scope: "molt", name: "core" };
 * is("jsr:@molt/core", pkg); // true
 * is("jsr:@molt/other", pkg); // false
 * ```
 */
export function is(str: string, pkg: Package): boolean {
  return str === stringify(pkg);
}

/**
 * Convert a dependency to a package representation if possible.
 * If the dependency is not a package, `undefined` is returned.
 *
 * @example
 * ```ts
 * const dependency = { protocol: "jsr", name: "core", version: "0.18.0" };
 * fromDependency(dependency); // { registry: "jsr", scope: "molt", name: "core" }
 * ```
 */
export function fromDependency(
  dependency: DependencySpec,
): Package | undefined {
  return tryParse(Spec.stringify(dependency, "kind", "name"));
}

export async function resolvePackageRoot(
  repo: Repository,
  pkg: Package,
  version?: string,
): Promise<string | undefined> {
  const tags = await getTags(repo);
  const ref = version
    ? tags.find((it) => equals(SemVer(it), SemVer(version)))
    : undefined;
  switch (repo.host) {
    case "github": {
      return github.resolvePackageRoot(repo, pkg, ref);
    }
    default:
      throw new Error(`Unsupported hosting platform: ${repo.host}`);
  }
}
