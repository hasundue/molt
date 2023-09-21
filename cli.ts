import { distinct } from "https://deno.land/std@0.202.0/collections/distinct.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { colors } from "https://deno.land/x/cliffy@v1.0.0-rc.3/ansi/colors.ts";
import { Select } from "https://deno.land/x/cliffy@v1.0.0-rc.3/prompt/mod.ts";
import {
  collectDependencyUpdateAll,
  type DependencyUpdate,
  execAll,
  writeAll,
} from "./mod.ts";
import { commitAll } from "./git/mod.ts";

const { gray, yellow, bold } = colors;

const check = new Command()
  .arguments("<entrypoints...:string[]>")
  .description("Check for updates to dependencies")
  .action(checkAction);

async function checkAction(_options: void, entrypoints: string[]) {
  console.log("🔎 Checking for updates...");
  const updates = await collectDependencyUpdateAll(entrypoints);
  const dependencies = new Map<string, DependencyUpdate[]>();
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  console.log("💡 Found updates:");
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
      console.log();
      console.log("💾 Writing changes...");
      writeAll(execAll(updates));
      return;
    case "commit":
      console.log();
      console.log("📝 Committing changes...");
      commitAll(updates, {
        groupBy: (dependency) => dependency.name,
      });
      return;
  }
}

const main = new Command()
  .name("molt")
  .version("0.1.0")
  .command("check", check);

await main.parse(Deno.args);
