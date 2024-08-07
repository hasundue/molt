import { Command } from "@cliffy/command";
import $ from "@david/dax";
import { collect } from "@molt/core";
import type { Update } from "@molt/core/types";
import { partition } from "@std/collections";

import { printChangelog } from "./src/changelog.ts";
import { findConfig, findLock, findSource } from "./src/files.ts";
import { runTasks } from "./src/tasks.ts";
import { print, printRefs } from "./src/updates.ts";

const main = new Command()
  .name("molt")
  .description("Check updates to dependencies in a Deno project.")
  .versionOption("-v, --version", "Print version info.", version)
  .option("-w, --write", "Write changes to the local files.", {
    conflicts: ["commit"],
  })
  .option("-c, --commit", "Commit changes to the local git repository.", {
    conflicts: ["write"],
  })
  .option(
    "--changelog=[types:string[]]",
    "Print commits for each update. (requires --unstable-kv)",
  )
  .option("--config <file:string>", "Specify the Deno configuration file.")
  .option("--dry-run", "See what would happen without actually doing it.")
  .option("--ignore <pattern:string>", "Specify dependencies to ignore.")
  .option("--only <pattern:string>", "Specify dependencies to check.")
  .option("--lock <file:string>", "Specify the lock file.")
  .option("--no-config", "Disable automatic loading of the configuration file.")
  .option("--no-lock", "Disable automatic loading of the lock file.")
  .option("--pre-commit=<tasks:string[]>", "Run tasks before each commit", {
    depends: ["commit"],
  })
  .option("--prefix <prefix:string>", "Prefix for commit messages", {
    depends: ["commit"],
  })
  .option("--referrer", "Print files that import the dependency.")
  .arguments("[source...:string]");

async function version() {
  const { default: configs } = await import("./deno.json", {
    with: { type: "json" },
  });
  console.log(configs.version);
}

main.action(async function (options, ...args) {
  const [jsons, modules] = partition(
    args,
    (it) => it.match(/\.jsonc?$/) !== null,
  );
  if (jsons.length > 1) {
    $.logError("Multiple configuration files found:", jsons.join(", "));
    Deno.exit(1);
  }
  const config = options.config === false
    ? undefined
    : options.config ?? jsons[0] ?? await findConfig();

  const lock = options.lock === false
    ? undefined
    : await findLock(options.lock);

  const source = modules.length ? modules : config ? [] : await findSource();

  if (options.dryRun) {
    const paths = [config, lock, ...source].filter((it) => it != null);
    await import("./src/mock.ts").then((m) => m.mock(paths));
  }

  const deps = await $.progress("Collecting dependencies").with(
    () => collect({ config, lock, source }),
  );
  const filtered = deps
    .filter((dep) => options.only ? dep.name.match(options.only) : true)
    .filter((dep) => options.ignore ? !dep.name.match(options.ignore) : true);

  const updates = (await $.progress("Fetching updates").with(() =>
    Promise.all(filtered.map((dep) =>
      dep.check()
    ))
  )).filter((u) => u != null).sort(compare);

  for (const update of updates) {
    print(update);
    if (options.referrer) {
      printRefs(update);
    }
    if (options.changelog) {
      await $.progress("Fetching changelog").with(() =>
        printChangelog(update, options)
      );
    }
  }

  if (options.write) {
    await $.progress("Writing changes").with(async () => {
      for (const update of updates) {
        await update.write();
      }
    });
  }

  if (options.commit) {
    for (const update of updates) {
      const message = update.summary(options.prefix);
      await $.progress(`Committing ${message}`).with(async () => {
        await update.write();
        if (options.preCommit) {
          await runTasks(options.preCommit, config);
        }
        await update.commit(message);
      });
    }
  }
});

const compare = (a: Update, b: Update) => a.dep.name.localeCompare(b.dep.name);

await main.parse(Deno.args);
