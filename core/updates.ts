import { ensure, is } from "@core/unknownutil";
import { filterValues, mapNotNullish, maxWith } from "@std/collections";
import * as SemVer from "@std/semver";
import {
  type DependencyKind,
  type DependencySpec,
  stringify,
  tryParse,
} from "./specs.ts";
import { assertOk } from "./internal.ts";

export interface DependencyState<
  K extends DependencyKind = DependencyKind,
> extends DependencySpec<K> {
  locked?: string;
}

export interface DependencyUpdate {
  /** The latest version that satisfies the constraint. */
  constrainted?: string;
  /** The latest version that is not a pre-release */
  released?: string;
  /** The latest version available, including pre-releases or whatever. */
  latest?: string;
}

/**
 * Try resolving the latest version of the given dep.
 *
 * @returns The latest version of the given dep, or `undefined` if the
 * latest version of dep is unable to resolve.
 *
 * @throws An error if the dep is not found in the registry.
 *
 * @example
 * await resolveLatestVersion(
 *   Dependency.parse(new URL("https://deno.land/std@0.220.0/bytes/copy.ts"))
 * );
 * // -> "0.224.0"
 */
export function get(
  dep: DependencyState,
): Promise<DependencyUpdate | undefined> {
  return dep.kind.startsWith("http")
    ? getRemoteUpdate(dep as DependencyState<"http" | "https">)
    : getPackageUpdate(dep as DependencyState<"jsr" | "npm">);
}

async function getRemoteUpdate(
  dep: DependencyState<"http" | "https">,
): Promise<DependencyUpdate | undefined> {
  const latest = await getRemoteLatestVersion(dep);
  if (!latest || latest === dep.constraint) {
    return;
  }
  const semver = SemVer.tryParse(latest);
  if (semver && !semver.prerelease?.length) {
    return { released: latest };
  }
  return { latest };
}

async function getRemoteLatestVersion(
  dep: DependencyState<"http" | "https">,
): Promise<string | undefined> {
  const url = stringify(dep, "kind", "name", "path");
  const res = await fetch(url, { method: "HEAD" });

  // We don't need the body, just the headers.
  await res.arrayBuffer();

  // We expect a redirect to the latest version.
  if (!res.redirected) {
    return;
  }
  return tryParse(res.url)?.constraint;
}

async function getPackageUpdate(
  dep: DependencyState<"jsr" | "npm">,
): Promise<DependencyUpdate | undefined> {
  const versions = await getVersions(dep);
  const semvers = mapNotNullish(versions, SemVer.tryParse);

  const locked = SemVer.tryParse(dep.locked);
  const range = SemVer.parseRange(dep.constraint);

  const constrainted = SemVer.maxSatisfying(
    semvers.filter((it) => SemVer.greaterThan(it, locked ?? SemVer.MIN)),
    range,
  );

  const unconstrainted = semvers.filter((it) =>
    SemVer.greaterThanRange(it, range)
  );
  const latest = maxWith(unconstrainted, SemVer.compare);

  const releases = unconstrainted.filter((it) => !it.prerelease?.length);
  const released = maxWith(releases, SemVer.compare);

  const update: DependencyUpdate = {};

  if (latest) update.latest = SemVer.format(latest);
  if (constrainted) update.constrainted = SemVer.format(constrainted);
  if (released) update.released = SemVer.format(released);

  if (update.latest === update.released) delete update.latest;

  return Object.keys(update).length ? update : undefined;
}

function getVersions(dep: DependencyState<"jsr" | "npm">): Promise<string[]> {
  switch (dep.kind) {
    case "npm":
      return getNpmVersions(dep as DependencyState<"npm">);
    case "jsr":
      return getJsrVersions(dep as DependencyState<"jsr">);
  }
}

async function getNpmVersions(dep: DependencyState<"npm">): Promise<string[]> {
  const res = await fetch(
    `https://registry.npmjs.org/${dep.name}`,
  );
  assertOk(res);
  const isNpmPackageMeta = is.ObjectOf({
    versions: is.RecordOf(
      is.ObjectOf({ version: is.String }),
      is.String,
    ),
  });
  const meta = ensure(await res.json(), isNpmPackageMeta);
  return Object.keys(meta.versions);
}

async function getJsrVersions(dep: DependencyState<"jsr">): Promise<string[]> {
  const res = await fetch(
    `https://jsr.io/${dep.name}/meta.json`,
  );
  assertOk(res);
  const isJsrPackageMeta = is.ObjectOf({
    versions: is.RecordOf(
      is.ObjectOf({ yanked: is.OptionalOf(is.LiteralOf(true)) }),
      is.String,
    ),
  });
  const meta = ensure(await res.json(), isJsrPackageMeta);
  return Object.keys(filterValues(meta.versions, (it) => !it.yanked));
}
