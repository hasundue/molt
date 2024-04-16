import { ensure, is } from "@core/unknownutil";
import { type Package, stringify } from "./packages.ts";

/**
 * A git repository on a hosting platform.
 */
export interface Repository<
  Host extends KnownGitHostingPlatform = KnownGitHostingPlatform,
> {
  host: Host;
  owner: string;
  name: string;
}

export type KnownGitHostingPlatform = "github";

/**
 * Resolve the repository of the given package
 */
export async function resolveRepository(
  pkg: Package,
): Promise<Repository | undefined> {
  const { registry, scope, name } = pkg;
  switch (registry) {
    case "jsr": {
      const response = await fetch(
        `https://api.jsr.io/scopes/${scope}/packages/${name}`,
        {
          headers: {
            "User-Agent": "molt/0.18.0; https://github.com/hasundue/molt",
          },
        },
      );
      if (!response.ok) {
        console.warn(
          `Failed to fetch details of ${
            stringify(pkg)
          }: ${response.statusText}`,
        );
        return;
      }
      const { githubRepository: repo } = ensure(
        await response.json(),
        isJsrPackageDetails,
        { message: `Unexpected response from JSR registry: ${response.url}` },
      );
      if (repo) {
        return { host: "github", name: repo.name, owner: repo.owner };
      }
    }
  }
}

/**
 * Resolve the created date of the given dependency as a number.
 * If the created date cannot be resolved, the current time is returned gracefully.
 *
 * @example
 * ```ts
 * const createdDate = await resolveCreatedDate({
 *   registry: "jsr",
 *   scope: "molt",
 *   name: "core",
 *   version: "0.18.0",
 * });
 * // => 1620000000000
 * ```
 */
export async function resolveCreatedDate(
  pkg: Package,
  version: string,
): Promise<number> {
  const { registry, scope, name } = pkg;
  switch (registry) {
    case "jsr": {
      if (!version) {
        return Date.now();
      }
      const response = await fetch(
        `https://api.jsr.io/scopes/${scope}/packages/${name}/versions/${version}`,
        {
          headers: {
            "User-Agent": "molt/0.18.0; https://github.com/hasundue/molt",
          },
        },
      );
      if (!response.ok) {
        console.warn(
          `Failed to fetch version details of ${
            stringify(pkg)
          }: ${response.statusText}`,
        );
        return Date.now();
      }
      const { createdAt } = ensure(
        await response.json(),
        isJsrPackageVersionDetails,
        { message: `Unexpected response from JSR registry: ${response.url}` },
      );
      return Date.parse(createdAt);
    }
    default:
      return Date.now();
  }
}

const isJsrPackageDetails = is.ObjectOf({
  githubRepository: is.OptionalOf(is.ObjectOf({
    owner: is.String,
    name: is.String,
  })),
});

const isJsrPackageVersionDetails = is.ObjectOf({
  createdAt: is.String,
});
