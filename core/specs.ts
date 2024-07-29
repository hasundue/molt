import { assert } from "@std/assert";
import { is, type Predicate } from "@core/unknownutil";

export type DependencyKind = "jsr" | "npm" | "http" | "https";

const isKind = (kind: string): kind is DependencyKind =>
  ["jsr", "npm", "http", "https"].includes(kind);

/**
 * Parsed components of a dependency specifier, being consistent with the
 * response from the `dependencies` endpoint of the JSR registry API.
 */
export interface DependencySpec<
  K extends DependencyKind = DependencyKind,
> {
  kind: K;
  /** The name of the dependency
   * @example "@std/fs", "hono", "deno.land/std" */
  name: string;
  /** The version constraint string of the dependency.
   * @example "0.222.1", "^0.222.0" */
  constraint: string;
  /** The entrypoint specifier of the dependency.
   * @example "/fs/mod.ts" */
  path?: string;
}

export const isDependencySpec: Predicate<DependencySpec> = is.ObjectOf({
  kind: is.LiteralOneOf(["jsr", "npm", "http", "https"] as const),
  name: is.String,
  constraint: is.String,
  path: is.String,
});

export function isRemote(
  dep: DependencySpec,
): dep is DependencySpec<"http" | "https"> {
  return dep.kind === "http" || dep.kind === "https";
}

/**
 * Parse components of the dependency from the given specifier.
 * @example
 * const { name, version, path } = parse(
 *   new URL("https://deno.land/std@0.200.0/fs/mod.ts")
 * );
 * // -> { type: "https", name: "deno.land/std", constraint: "0.200.0" }
 */
export function parse(specifier: string): DependencySpec {
  const url = new URL(specifier);

  const kind = url.protocol.slice(0, -1);
  assert(isKind(kind), `Invalid protocol: ${kind}:`);

  const body = url.hostname + url.pathname;
  // Try to find a path segment like "<name>@<version>/"
  const matched = body.match(
    /^(?<name>.+)@(?<constraint>[^/]+)(?<path>\/.*)?$/,
  );
  if (!matched) {
    throw new Error(`Could not parse dependency: ${specifier}`);
  }
  const { name, constraint, path } = matched.groups as {
    name: string;
    constraint: string;
    path?: string;
  };
  return path ? { kind, name, constraint, path } : { kind, name, constraint };
}

/**
 * Try to parse a dependency from a string representation.
 * @returns The parsed dependency, or `undefined` if the specifier is not parsable.
 */
export function tryParse(specifier: string): DependencySpec | undefined {
  try {
    return parse(specifier);
  } catch {
    return undefined;
  }
}

export interface StringifyOptions {
  omit?: ("protocol" | "constraint" | "path")[];
}

/**
 * Convert the given dependency to a URL string.
 * @example
 * ```ts
 * stringify({
 *   kind: "https",
 *   name: "deno.land/std",
 *   constraint: "1.0.0",
 *   path: "/fs/mod.ts",
 * }); // -> "https://deno.land/std@1.0.0/fs/mod.ts"
 * ```
 */
export function stringify(
  dependency: DependencySpec,
  ...comps: (keyof DependencySpec)[]
): string {
  comps = comps.length ? comps : ["kind", "name", "constraint", "path"];
  let str = "";
  if (comps.includes("kind")) {
    str += dependency.kind + ":";
    if (dependency.kind.startsWith("http")) str += "//";
  }
  str += dependency.name;
  if (comps.includes("constraint") && dependency.constraint) {
    str += `@${dependency.constraint}`;
  }
  if (comps.includes("path") && dependency.path) {
    str += dependency.path;
  }
  return str;
}

/**
 * Returns an identifier of the given dependency.
 *
 * @example
 * ```ts
 * identify(parse("https://deno.land/std@0.200.0/fs/mod.ts"));
 * // -> "https://deno.land/std@0.200.0/fs/mod.ts"
 *
 * identify(parse("jsr:@std/fs@^0.222.0/copy"));
 * // -> "jsr:@std/fs@^0.222.0"
 * ```
 */
export function identify(dep: DependencySpec): string {
  return isRemote(dep)
    ? stringify(dep)
    : stringify(dep, "kind", "name", "constraint");
}
