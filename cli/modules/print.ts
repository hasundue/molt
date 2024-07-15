import { distinct, mapNotNullish } from "@std/collections";
import { relative } from "@std/path";
import { colors } from "@cliffy/ansi/colors";
import type { CollectResult, DependencyUpdate } from "@molt/core";

const { gray, yellow, bold } = colors;

export default async function (
  entrypoints: string[],
  result: CollectResult,
  options: { changelog?: true | string[] },
): Promise<void> {
  /** A map of names of dependencies to a list of updates */
  const dependencies = new Map<string, DependencyUpdate[]>();
  for (const u of result.updates) {
    const list = dependencies.get(u.to.name) ?? [];
    list.push(u);
    dependencies.set(u.to.name, list);
  }
  /** A list of files that being updated */
  const files = distinct(result.updates.map((u) => u.referrer));
  //
  // Print information on each dependency
  //
  for (const [name, updates] of dependencies) {
    const froms = mapNotNullish(updates, (it) => it.from);
    const updated = updates[0].to;
    //
    // Print the name of the dependency and the version change
    // ex. deno.land/std 0.220, 0.222.1 => 0.223.0
    //
    const versions = distinct(froms.map((d) => d.version));
    const joined = versions.join(", ");
    console.log(
      `📦 ${bold(name)} ${yellow(joined)} => ${yellow(updated.version)}`,
    );
    //
    // Print a curated changelog for the dependency
    //
    if (options.changelog) {
      const { default: printChangeLog } = await import("./changelog.ts");
      try {
        await printChangeLog(updated, froms, options);
      } catch {
        // The dependency is a package but not tagged in the repository
      }
    }
    //
    // Print modules that import the dependency.
    // ex. /path/to/mod.ts 0.222.1
    //
    if (entrypoints.length > 1 || files.length > 1) {
      distinct(
        updates.map((u) => {
          const source = relative(Deno.cwd(), u.map?.source ?? u.referrer);
          const version = versions.length > 1 ? u.from?.version : undefined;
          return "  " + gray(source + (version ? ` (${version})` : ""));
        }),
      ).forEach((it) => console.log(it));
    }
  }
}
