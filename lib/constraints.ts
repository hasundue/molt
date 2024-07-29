import * as SemVer from "@std/semver";
import { assert, unreachable } from "@std/assert";

/**
 * Increase a version constraint to satisfy the given version if necessary.
 *
 * @param constraint The current version constraint.
 * @param version The version to satisfy.
 * @returns The increased version constraint.
 *
 * @throws An error if the version constraint is not in a supported format.
 *
 * @example
 * ```ts
 * increase("^1.0.0", "1.2.3"); // -> "^1.0.0"
 * increase("^1.0.0", "2.1.1"); // -> "^2.0.0"
 * ```
 */
export function increase(
  constraint: string,
  version: string,
): string {
  try {
    return _increase(constraint, version);
  } catch (cause) {
    throw new Error(`Unexpected format of version constraint: ${constraint}`, {
      cause,
    });
  }
}

function _increase(
  constraint: string,
  version: string,
): string {
  const range = SemVer.parseRange(constraint);
  assert(range.length === 1);

  const target = SemVer.parse(version);

  if (SemVer.satisfies(target, range)) {
    return constraint;
  }

  const comparators = range[0];

  if (comparators.length === 1 && comparators[0].operator === undefined) {
    // An equality constraint
    return version;
  }

  const lower = comparators.find((it) => it.operator === ">=");
  assert(lower);

  const upper = comparators.find((it) => it.operator === "<");
  assert(upper);

  // Caret version
  if (constraint.startsWith("^")) {
    if (target.major) {
      return `^${target.major}.0.0`;
    }
    if (target.minor) {
      return `^0.${target.minor}.0`;
    }
    return `^0.0.${target.patch}`;
  }

  // Tilde version
  if (constraint.startsWith("~")) {
    if (target.major) {
      return `~${target.major}.${target.minor}.0`;
    }
    return `~${target.major}.${target.minor}.${target.patch}`;
  }

  // Partial version, major and minor (e.g. "1.2")
  if (constraint.match(/^[0-9]+\.[0-9]+$/)) {
    return `${target.major}.${target.minor}`;
  }

  // Partial version, major only (e.g. "1")
  if (constraint.match(/^[0-9]+$/)) {
    return `${target.major}`;
  }

  // X-wildcarded version, patch (e.g. "1.2.x")
  if (constraint.match(/^[0-9]+\.[0-9]+\.x$/)) {
    return `${target.major}.${target.minor}.x`;
  }

  // X-wildcarded version, minor (e.g. "1.x")
  if (constraint.match(/^[0-9]+\.x$/)) {
    return `${target.major}.x`;
  }

  // Star-wildcarded version, path (e.g. "1.2.*")
  if (constraint.match(/^[0-9]+\.[0-9]+\.\*$/)) {
    return `${target.major}.${target.minor}.*`;
  }

  // Star-wildcarded version, minor (e.g. "1.*")
  if (constraint.match(/^[0-9]+\.\*$/)) {
    return `${target.major}.*`;
  }

  unreachable();
}
