import { distinct } from "https://deno.land/std@0.202.0/collections/distinct.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/command.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";
import { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/select.ts";
import {
  collectDependencyUpdateAll,
  type DependencyUpdate,
  execAll,
  write as writeUpdateResult,
} from "./mod.ts";
import { commitAll } from "./git/mod.ts";

const { gray, yellow, bold } = colors;

const checkCommand = new Command()
  .arguments("<entrypoints...:string[]>")
  .description("Check for the latest version of dependencies")
  .action(checkAction);

async function checkAction(_options: void, entrypoints: string[]) {
  console.log("🔎 Checking for updates...");
  const updates = await collectDependencyUpdateAll(entrypoints);
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  print(updates);
  const action = await Select.prompt({
    message: "Choose an action",
    options: [
      {
        name: "Abort",
        value: "abort",
      },
      {
        name: "Write changes to local files",
        value: "write",
      },
      {
        name: "Commit changes to git",
        value: "commit",
      },
    ],
  });
  switch (action) {
    case "abort":
      return;
    case "write":
      return write(updates);
    case "commit":
      return commit(updates);
  }
}

const updateCommand = new Command()
  .arguments("<entrypoints...:string[]>")
  .description("Update dependencies to the latest version")
  .option("--commit", "Commit changes to git")
  .action(updateAction);

async function updateAction(
  options: { commit?: boolean },
  entrypoints: string[],
) {
  console.log("🔎 Checking for updates...");
  const updates = await collectDependencyUpdateAll(entrypoints);
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  print(updates);
  if (options.commit) {
    return commit(updates);
  }
  return write(updates);
}

function print(updates: DependencyUpdate[]) {
  console.log("💡 Found updates:");
  const dependencies = new Map<string, DependencyUpdate[]>();
  for (const u of updates) {
    const list = dependencies.get(u.name) ?? [];
    list.push(u);
    dependencies.set(u.name, list);
  }
  for (const [name, list] of dependencies.entries()) {
    console.log();
    const froms = distinct(list.map((u) => u.version.from)).join(", ");
    console.log(
      `📦 ${bold(name)} ${yellow(froms)} => ${yellow(list[0].version.to)}`,
    );
    for (const u of list) {
      console.log(`  ${u.referrer} ` + gray(u.version.from));
    }
  }
  console.log();
}

function write(updates: DependencyUpdate[]) {
  console.log();
  console.log("💾 Writing changes...");
  const results = execAll(updates);
  results.forEach((result) => {
    console.log(`  ${result.specifier}`);
    writeUpdateResult(result);
  });
}

function commit(updates: DependencyUpdate[]) {
  console.log();
  console.log("📝 Committing changes...");
  commitAll(updates, {
    groupBy: (dependency) => dependency.name,
  });
}

const main = new Command()
  .name("molt")
  .description("A tool for updating dependencies in Deno projects")
  .version("0.1.0")
  .command("check", checkCommand)
  .command("update", updateCommand);

await main.parse(Deno.args);
