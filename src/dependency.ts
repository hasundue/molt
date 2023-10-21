import type { Maybe } from "../lib/types.ts";
import { Mutex } from "../lib/x/async.ts";
import type { Path, SemVerString } from "./types.ts";
import { parseSemVer, SEMVER_REGEXP } from "./semver.ts";
import { assertExists } from "../lib/std/assert.ts";

export interface Dependency {
  name: string;
  version: SemVerString;
  path: Path;
}

export const Dependency = {
  parseProps,
  resolveLatestSemVer,
};

function parseProps(
  url: URL,
): Maybe<Dependency> {
  const body = url.hostname + url.pathname;
  const semver = parseSemVer(url.href);
  if (!semver) {
    // The specifier does not contain a semver.
    return;
  }
  const atSemver = "@" + semver;
  const name = body.split(atSemver)[0];
  const path = body.slice(name.length + atSemver.length);
  return { name, version: semver, path: path as Path };
}

async function resolveLatestSemVer(
  url: URL,
): Promise<Maybe<SemVerString>> {
  await LatestSemverCache.lock(url);
  const result = await _resolve(url);
  LatestSemverCache.unlock(url);
  return result;
}

async function _resolve(
  url: URL,
): Promise<Maybe<SemVerString>> {
  const cached = LatestSemverCache.get(url);
  if (cached) {
    return cached;
  }
  if (cached === null) {
    // The dependency is already found to be up to date.
    return;
  }
  const props = parseProps(url);
  if (!props) {
    // The specifier is does not contain a semver.
    return;
  }
  switch (url.protocol) {
    case "npm:": {
      const response = await fetch(
        `https://registry.npmjs.org/${props.name}`,
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch npm registry: ${response.statusText}`,
        );
      }
      const json = await response.json();
      if (!json["dist-tags"]?.latest) {
        throw new Error(
          `Could not find the latest version of ${props.name} from registry.`,
        );
      }
      const latestSemVer: string = json["dist-tags"].latest;
      if (latestSemVer === props.version) {
        // The dependency is up to date
        LatestSemverCache.set(url, null);
        return;
      }
      return LatestSemverCache.set(url, latestSemVer as SemVerString);
    }
    case "http:":
    case "https:": {
      const response = await fetch(
        url.protocol + "//" + props.name + props.path,
        { method: "HEAD" },
      );
      await response.arrayBuffer();
      if (!response.redirected) {
        // The host did not redirect to a url with semver
        LatestSemverCache.set(url, null);
        return;
      }
      const specifierWithLatestSemVer = response.url;
      if (specifierWithLatestSemVer === url.href) {
        // The dependency is up to date
        LatestSemverCache.set(url, null);
        return;
      }
      return LatestSemverCache.set(
        url,
        parseSemVer(specifierWithLatestSemVer) as SemVerString,
      );
    }
    case "node:":
    case "file:":
      return;
    default:
      // TODO: throw an error?
      return;
  }
}

class LatestSemverCache {
  static #mutex = new Map<string, Mutex>();
  static #cache = new Map<string, SemVerString | null>();

  static lock(url: URL): Promise<void> {
    const key = this.getKey(url);
    const mutex = this.#mutex.get(key) ??
      this.#mutex.set(key, new Mutex()).get(key)!;
    return mutex.acquire();
  }

  static unlock(url: URL): void {
    const key = this.getKey(url);
    const mutex = this.#mutex.get(key);
    assertExists(mutex);
    mutex.release();
  }

  static get(url: URL): SemVerString | null | undefined {
    const key = this.getKey(url);
    return this.#cache.get(key);
  }

  static set<T extends SemVerString | null>(
    url: URL,
    semver: T,
  ): T {
    const key = this.getKey(url);
    this.#cache.set(key, semver);
    return semver;
  }

  static getKey(url: URL): string {
    return url.href.split(SEMVER_REGEXP)[0];
  }
}
