import { minWith } from "@std/collections";
import { curateChangeLog } from "@molt/lib/changelog";
import {
  compareCommits,
  fromDependency,
  resolveCreatedDate,
  resolvePackageRoot,
  resolveRepository,
} from "@molt/integration";
import type { Dependency, UpdatedDependency } from "@molt/core";

export default async function (
  updated: UpdatedDependency,
  froms: Dependency[],
  options: {
    changelog?: true | string[];
  },
) {
  const pkg = fromDependency(updated);
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
  await Promise.all(
    froms.map(async (it) => {
      dates.set(name, await resolveCreatedDate(pkg, it.version!));
    }),
  );
  /** The oldest update from which to fetch commit logs */
  const oldest = minWith(
    froms,
    (a, b) => Math.sign(dates.get(a.name)! - dates.get(b.name)!),
  );
  if (!oldest) {
    // The dependency was newly added in this update
    return;
  }
  const messages = await compareCommits(
    repo,
    oldest.version!,
    updated.version,
  );
  const root = await resolvePackageRoot(repo, pkg, updated.version);
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
      console.log(` ${type}: ${record.text}`);
    }
  }
}
