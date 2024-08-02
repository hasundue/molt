import { minWith } from "@std/collections";
import { curateChangeLog } from "@molt/lib/changelog";
import {
  compareCommits,
  resolveCreatedDate,
  resolvePackageRoot,
  resolveRepository,
  tryParse,
} from "@molt/integration";
import type { Update } from "@molt/core/types";
import * as SemVer from "@std/semver";

export async function printChangelog(
  update: Update,
  options: {
    changelog?: true | string[];
  },
) {
  const bump = update.lock ?? update.constraint!;
  // Can't provide a changelog for a non-semver update
  if (!SemVer.tryParse(bump.to)) {
    return "";
  }
  const froms = bump.from.split(", ");
  const to = bump.to;

  const pkg = tryParse(update.dep.specifier);
  if (!pkg) {
    // Can't provide a changelog for a non-package dependency
    return;
  }
  const repo = await resolveRepository(pkg);
  if (!repo) {
    return;
  }

  /** A map of dependency names to the created date of the oldest update */
  const dates = new Map<string, number>();
  await Promise.all(froms.map(async (it) => {
    dates.set(it, await resolveCreatedDate(pkg, it));
  }));
  /** The oldest update from which to fetch commit logs */
  const oldest = minWith(
    froms,
    (a, b) => Math.sign(dates.get(a)! - dates.get(b)!),
  );
  if (!oldest) {
    // The dependency was newly added in this update
    return;
  }
  const messages = await compareCommits(repo, oldest, to);
  if (!messages.length) {
    // Couldn't find tags for the versions
    return;
  }
  const root = await resolvePackageRoot(repo, pkg, to);
  if (!root) {
    // The package seems to be generated dynamically on publish
    return;
  }
  const changelog = curateChangeLog(messages, {
    types: Array.isArray(options.changelog)
      ? options.changelog
      : ["feat", "fix", "deprecation"],
    scope: root !== "." ? pkg.name : undefined,
  });
  for (const [type, records] of Object.entries(changelog)) {
    for (const record of records) {
      console.log(`    ${type}: ${record.text}`);
    }
  }
}
