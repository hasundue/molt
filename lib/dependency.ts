import { assertExists } from "./std/assert.ts";
import { Mutex } from "./x/async.ts";
import type { Maybe, Path, SemVerString } from "./types.ts";

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

export interface DependencyProps {
  name: string;
  version?: SemVerString;
  path?: Path;
}

export const Dependency = {
  parseProps,
  resolveLatestURL,
};

function parseProps(url: URL): DependencyProps {
  const body = url.hostname + url.pathname;
  const semver = parseSemVer(url.href);
  if (!semver) {
    return { name: body };
  }
  const atSemver = "@" + semver;
  const name = body.split(atSemver)[0];
  const path = body.slice(name.length + atSemver.length);
  return { name, version: semver, path: path as Path };
}

export async function resolveLatestURL(
  url: URL,
): Promise<Maybe<URL>> {
  const props = parseProps(url);
  await LatestUrlCache.lock(props.name);
  const result = await _resolve(url, props);
  LatestUrlCache.unlock(props.name);
  return result;
}

async function _resolve(
  url: URL,
  props: DependencyProps,
): Promise<Maybe<URL>> {
  const cached = LatestUrlCache.get(props.name);
  if (cached) {
    return cached;
  }
  if (cached === null) {
    // The dependency is already found to be up to date or unable to resolve.
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
      const latestSemVer = json["dist-tags"].latest as SemVerString;
      if (latestSemVer === props.version) {
        // The dependency is up to date
        LatestUrlCache.set(props.name, null);
        return;
      }
      return LatestUrlCache.set(
        props.name,
        new URL(`npm:${props.name}@${latestSemVer}${props.path}`),
      );
    }
    case "http:":
    case "https:": {
      const response = await fetch(
        url.protocol + "//" + props.name + (props.path ?? ""),
        { method: "HEAD" },
      );
      await response.arrayBuffer();
      if (!response.redirected) {
        // The host did not redirect
        LatestUrlCache.set(props.name, null);
        return;
      }
      const latest = new URL(response.url);
      if (latest === url) {
        // The dependency is already up to date
        LatestUrlCache.set(props.name, null);
        return;
      }
      return LatestUrlCache.set(props.name, latest);
    }
    case "node:":
    case "file:":
      return;
    default:
      // TODO: throw an error?
      return;
  }
}

class LatestUrlCache {
  static #mutex = new Map<string, Mutex>();
  static #cache = new Map<string, URL | null>();

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

  static get(name: string): URL | null | undefined {
    return this.#cache.get(name);
  }

  static set<T extends URL | null>(
    name: string,
    url: T,
  ): T {
    this.#cache.set(name, url);
    return url;
  }
}
