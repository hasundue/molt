import { assertExists } from "./std/assert.ts";
import { Mutex } from "./x/async.ts";
import type { Maybe, Path, SemVerString } from "./types.ts";
import { URI } from "./uri.ts";

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_REGEXP =
  /@v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

export function parseSemVer(
  specifier: string,
): Maybe<SemVerString> {
  const match = specifier.match(SEMVER_REGEXP);
  if (!match) {
    return undefined;
  }
  if (match.length > 1) {
    console.warn(
      "Multiple semvers in a single specifier is not supported:",
      specifier,
    );
    return undefined;
  }
  return match[0].slice(1) as SemVerString;
}

export interface Dependency {
  scheme: "http://" | "https://" | "npm:" | "node:" | "file:///";
  name: string;
  version?: SemVerString;
  path?: Path;
}

export interface LatestDependency extends Dependency {
  version: SemVerString;
}

export const Dependency = {
  parse(url: URL): Dependency {
    const scheme = url.protocol === "npm:" ? "npm:" : url.protocol + "//";
    const body = url.hostname + url.pathname;
    const semver = parseSemVer(url.href);
    if (!semver) {
      return { scheme, name: body } as Dependency;
    }
    const atSemver = "@" + semver;
    const name = body.split(atSemver)[0];
    const path = body.slice(name.length + atSemver.length);
    return { scheme, name, version: semver, path: path as Path } as Dependency;
  },
  toURI(dependency: Dependency): URI<"http" | "https" | "npm"> {
    return URI.ensure("http", "https", "npm")(
      `${dependency.scheme}${dependency.name}${
        dependency.version ? "@" + dependency.version : ""
      }${dependency.path ?? ""}`,
    );
  },
  async resolveLatest(
    dependency: Dependency,
  ): Promise<Maybe<LatestDependency>> {
    await LatestDependencyCache.lock(dependency.name);
    const result = await _resolveLatest(dependency);
    LatestDependencyCache.unlock(dependency.name);
    return result;
  },
};

async function _resolveLatest(
  dependency: Dependency,
): Promise<Maybe<LatestDependency>> {
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
      const json = await response.json();
      if (!json["dist-tags"]?.latest) {
        throw new Error(
          `Could not find the latest version of ${dependency.name} from registry.`,
        );
      }
      const latestSemVer = json["dist-tags"].latest as SemVerString;
      if (latestSemVer === dependency.version) {
        // The dependency is up to date
        LatestDependencyCache.set(dependency.name, null);
        return;
      }
      return LatestDependencyCache.set(
        dependency.name,
        { ...dependency, version: latestSemVer },
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
        !latest.version || // The redirected URL has no semver
        latest.version === dependency.version // The dependency is already up to date
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
