import { assertExists } from "./std/assert.ts";
import { Mutex } from "./x/async.ts";
import { ensure, is } from "./x/unknownutil.ts";
import { SemVerString } from "./semver.ts";

/**
 * Properties of a dependency parsed from an import specifier.
 */
export interface Dependency {
  /**
   * The URL protocol of the dependency.
   * @example
   * ```ts
   * const { protocol } = Dependency.parse(
   *   new URL("https://deno.land/std/fs/mod.ts")
   * );
   * // -> "https:"
   */
  protocol: string;
  /**
   * The name of the dependency.
   * @example
   * ```ts
   * const { name } = Dependency.parse(
   *   new URL("https://deno.land/std@0.205.0/fs/mod.ts")
   * );
   * // -> "deno.land/std"
   * ```
   */
  name: string;
  /**
   * The semver string of the dependency.
   * @example
   * ```ts
   * const { version } = Dependency.parse(
   *   new URL("https://deno.land/std@0.205.0/fs/mod.ts")
   * );
   * // -> "0.205.0"
   * ```
   */
  version?: SemVerString;
  /**
   * The subpath of the dependency.
   * @example
   * ```ts
   * const { path } = Dependency.parse(
   *   new URL("https://deno.land/std@0.205.0/fs/mod.ts")
   * );
   * // -> "/fs/mod.ts"
   * ```
   */
  path?: string;
}

/**
 * Properties of a dependency parsed from an updated import specifier.
 * The `version` property is guaranteed to be a semver string.
 */
export interface UpdatedDependency extends Dependency {
  version: SemVerString;
}

/**
 * Parse properties of a dependency from the given URL.
 * @example
 * ```ts
 * const { name, version, path } = Dependency.parse(
 *   new URL("https://deno.land/std@0.200.0/fs/mod.ts")
 * );
 * // -> { name: "deno.land/std", version: "0.200.0", path: "/fs/mod.ts" }
 * ```
 */
export function parse(url: string | URL): Dependency {
  url = new URL(url);
  const protocol = url.protocol;
  const body = url.hostname + url.pathname;
  const semver = SemVerString.extract(url.href);
  if (!semver) {
    return { protocol, name: body };
  }
  const atSemver = "@" + semver;
  const name = body.split(atSemver)[0];
  const path = body.slice(name.length + atSemver.length);
  return { protocol, name, version: semver, path };
}

/**
 * Convert the given protocol to a URL scheme.
 */
function toScheme(protocol: string): string {
  switch (protocol) {
    case "http:":
    case "https:":
      return protocol + "//";
    case "file:":
      return protocol + "///";
    default:
      return protocol;
  }
}

/**
 * Convert the given dependency to a URL.
 * @example
 * ```ts
 * const uri = toURL({
 *   protocol: "https:",
 *   name: "deno.land/std",
 *   version: "1.0.0",
 *   path: "/fs/mod.ts",
 * }).href;
 * // -> "https://deno.land/std@1.0.0/fs/mod.ts"
 * ```
 */
export function toUrl(dependency: Dependency): URL {
  const scheme = toScheme(dependency.protocol);
  const version = dependency.version ? "@" + dependency.version : "";
  const path = dependency.path ?? "";
  return new URL(`${scheme}${dependency.name}${version}${path}`);
}

/**
 * Resolve the latest version of the given dependency.
 *
 * @returns The latest version of the given dependency, or `undefined` if the
 * latest version of dependency is unable to resolve.
 *
 * @throws An error if the dependency is not found in the registry.
 *
 * @example
 * ```ts
 * await Dependency.resolveLatestVersion(
 *   Dependency.parse(new URL("https://deno.land/std@0.200.0/fs/mod.ts"))
 * );
 * // -> { name: "deno.land/std", version: "0.207.0", path: "/fs/mod.ts" }
 * ```
 */
export async function resolveLatestVersion(
  dependency: Dependency,
): Promise<UpdatedDependency | undefined> {
  await LatestVersionCache.lock(dependency.name);
  const result = await _resolveLatestVersion(dependency);
  LatestVersionCache.unlock(dependency.name);
  return result;
}

class LatestVersionCache {
  static #mutex = new Map<string, Mutex>();
  static #cache = new Map<string, UpdatedDependency | null>();

  static lock(name: string): Promise<void> {
    const mutex = this.#mutex.get(name) ??
      this.#mutex.set(name, new Mutex()).get(name)!;
    return mutex.acquire();
  }

  static unlock(name: string): void {
    const mutex = this.#mutex.get(name);
    assertExists(mutex);
    mutex.release();
  }

  static get(name: string): UpdatedDependency | null | undefined {
    return this.#cache.get(name);
  }

  static set<T extends UpdatedDependency | null>(
    name: string,
    dependency: T,
  ): T {
    this.#cache.set(name, dependency);
    return dependency;
  }
}

async function _resolveLatestVersion(
  dependency: Dependency,
): Promise<UpdatedDependency | undefined> {
  const cached = LatestVersionCache.get(dependency.name);
  if (cached) {
    return { ...cached, path: dependency.path };
  }
  if (cached === null) {
    // The dependency is already found to be up to date or unable to resolve.
    return;
  }
  switch (dependency.protocol) {
    case "npm:": {
      const response = await fetch(
        `https://registry.npmjs.org/${dependency.name}`,
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch npm registry: ${response.statusText}`,
        );
      }
      const pkg = ensure(
        await response.json(),
        is.ObjectOf({
          "dist-tags": is.ObjectOf({
            latest: is.String,
          }),
        }),
        { message: `Invalid response from NPM registry: ${response.url}` },
      );
      const latest = SemVerString.extract(pkg["dist-tags"].latest);
      if (
        latest === undefined || // The latest version is not a semver
        latest === dependency.version || // The dependency is already up to date
        SemVerString.isPreRelease(latest)
      ) {
        LatestVersionCache.set(dependency.name, null);
        return;
      }
      return LatestVersionCache.set(
        dependency.name,
        { ...dependency, version: latest },
      );
    }
    case "http:":
    case "https:": {
      const response = await fetch(
        toScheme(dependency.protocol) + dependency.name +
          (dependency.path ?? ""),
        { method: "HEAD" },
      );
      await response.arrayBuffer();
      if (!response.redirected) {
        // The host did not redirect
        LatestVersionCache.set(dependency.name, null);
        return;
      }
      const latest = parse(new URL(response.url));
      if (
        latest.version === undefined || // The redirected URL has no semver
        SemVerString.isPreRelease(latest.version)
      ) {
        LatestVersionCache.set(dependency.name, null);
        return;
      }
      return LatestVersionCache.set(
        dependency.name,
        latest as UpdatedDependency,
      );
    }
    default:
      // TODO: throw an error?
      return;
  }
}
