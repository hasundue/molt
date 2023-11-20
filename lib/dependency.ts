import { assertExists } from "./std/assert.ts";
import { Mutex } from "./x/async.ts";
import { ensure, is } from "./x/unknownutil.ts";
import type { Path } from "./types.ts";
import { SemVerString } from "./semver.ts";
import { URI } from "./uri.ts";

/**
 * Properties of a dependency parsed from an import specifier.
 */
export interface Dependency {
  /**
   * The URI scheme of the dependency specifier.
   */
  scheme: "http://" | "https://" | "file:///" | "npm:" | "node:";
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
   */
  path?: Path;
}

/**
 * Properties of a dependency parsed from an updated import specifier.
 * The `version` property is guaranteed to be a semver string.
 */
export interface LatestDependency extends Dependency {
  version: SemVerString;
}

export const Dependency = {
  /**
   * Parse properties of a dependency from the given URL.
   * @example
   * ```ts
   * const { scheme, name, version, path } = Dependency.parse(
   *   new URL("https://deno.land/std@1.0.0/fs/mod.ts")
   * );
   * // -> { scheme: "https://", name: "deno.land/std", version: "1.0.0", path: "/fs/mod.ts" }
   */
  parse(url: URL): Dependency {
    const scheme = url.protocol === "npm:" ? "npm:" : url.protocol + "//";
    const body = url.hostname + url.pathname;
    const semver = SemVerString.parse(url.href);
    if (!semver) {
      return { scheme, name: body } as Dependency;
    }
    const atSemver = "@" + semver;
    const name = body.split(atSemver)[0];
    const path = body.slice(name.length + atSemver.length);
    return { scheme, name, version: semver, path: path as Path } as Dependency;
  },
  /**
   * Convert the given dependency to a URI.
   * @example
   * ```ts
   * const uri = Dependency.toURI({
   *   scheme: "https://",
   *   name: "deno.land/std",
   *   version: "1.0.0",
   *   path: "/fs/mod.ts",
   * });
   * // -> "https://deno.land/std@1.0.0/fs/mod.ts"
   */
  toURI(dependency: Dependency): URI<"http" | "https" | "npm"> {
    return URI.ensure("http", "https", "npm")(
      `${dependency.scheme}${dependency.name}${
        dependency.version ? "@" + dependency.version : ""
      }${dependency.path ?? ""}`,
    );
  },
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
   * await Dependency.resolveLatest({
   *   scheme: "https://",
   *   name: "deno.land/std",
   *   version: "0.200.0",
   *   path: "/fs/mod.ts",
   * });
   * // -> { scheme: "https://", name: "deno.land/std", version: "0.206.0", path: "/fs/mod.ts" }
   * ```
   */
  async resolveLatest(
    dependency: Dependency,
  ): Promise<LatestDependency | undefined> {
    await LatestDependencyCache.lock(dependency.name);
    const result = await _resolveLatest(dependency);
    LatestDependencyCache.unlock(dependency.name);
    return result;
  },
};

async function _resolveLatest(
  dependency: Dependency,
): Promise<LatestDependency | undefined> {
  const cached = LatestDependencyCache.get(dependency.name);
  if (cached) {
    return { ...cached, path: dependency.path };
  }
  if (cached === null) {
    // The dependency is already found to be up to date or unable to resolve.
    return;
  }
  switch (dependency.scheme) {
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
      const latest = SemVerString.parse(pkg["dist-tags"].latest);
      if (
        latest === undefined || // The latest version is not a semver
        latest === dependency.version || // The dependency is already up to date
        SemVerString.isPreRelease(latest)
      ) {
        LatestDependencyCache.set(dependency.name, null);
        return;
      }
      return LatestDependencyCache.set(
        dependency.name,
        { ...dependency, version: latest },
      );
    }
    case "http://":
    case "https://": {
      const response = await fetch(
        dependency.scheme + dependency.name + (dependency.path ?? ""),
        { method: "HEAD" },
      );
      await response.arrayBuffer();
      if (!response.redirected) {
        // The host did not redirect
        LatestDependencyCache.set(dependency.name, null);
        return;
      }
      const latest = Dependency.parse(new URL(response.url));
      if (
        latest.version === undefined || // The redirected URL has no semver
        SemVerString.isPreRelease(latest.version)
      ) {
        LatestDependencyCache.set(dependency.name, null);
        return;
      }
      return LatestDependencyCache.set(
        dependency.name,
        latest as LatestDependency,
      );
    }
    case "node:":
    case "file:///":
      return;
    default:
      // TODO: throw an error?
      return;
  }
}

class LatestDependencyCache {
  static #mutex = new Map<string, Mutex>();
  static #cache = new Map<string, LatestDependency | null>();

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

  static get(name: string): LatestDependency | null | undefined {
    return this.#cache.get(name);
  }

  static set<T extends LatestDependency | null>(
    name: string,
    dependency: T,
  ): T {
    this.#cache.set(name, dependency);
    return dependency;
  }
}
