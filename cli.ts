import { existsSync } from "./lib/std/fs.ts";
import { distinct } from "./lib/std/collections.ts";
import { colors, Command, Select } from "./lib/x/cliffy.ts";
import { URI } from "./lib/uri.ts";
import { DependencyUpdate, FileUpdate } from "./mod.ts";
import { commitAll } from "./git/mod.ts";

const { gray, yellow, bold } = colors;

const checkCommand = new Command()
  .description("Check for the latest version of dependencies")
  .option("--import-map <file:string>", "Specify import map file")
  .arguments("<entrypoints...:string>")
  .action(checkAction);

async function checkAction(
  options: { importMap?: string },
  ...entrypoints: string[]
) {
  console.log("🔎 Checking for updates...");
  console.debug(entrypoints);
  const updates = await DependencyUpdate.collect(entrypoints, {
    importMap: options.importMap ?? _findImportMap(),
  });
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  _print(updates);
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
      return _write(updates);
    case "commit":
      return _commit(updates);
  }
}

const updateCommand = new Command()
  .description("Update dependencies to the latest version")
  .option("--commit", "Commit changes to git")
  .option("--import-map <file:string>", "Specify import map file")
  .arguments("<entrypoints...:string>")
  .action(updateAction);

async function updateAction(
  options: { commit?: boolean; importMap?: string },
  ...entrypoints: string[]
) {
  console.log("🔎 Checking for updates...");
  const updates = await DependencyUpdate.collect(entrypoints, {
    importMap: options.importMap ?? _findImportMap(),
  });
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  _print(updates);
  if (options.commit) {
    return _commit(updates);
  }
  return _write(updates);
}

function _findImportMap(): string | undefined {
  return ["./import_map.json", "./deno.json", "./deno.jsonc"]
    .find((path) => existsSync(path));
}

function _print(updates: DependencyUpdate[]) {
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
    distinct(
      list.map((u) => {
        const source = URI.relative(u.map?.source ?? u.referrer);
        return `  ${source} ` + gray(u.version.from);
      }),
    ).forEach((line) => console.log(line));
  }
  console.log();
}

function _write(updates: DependencyUpdate[]) {
  console.log();
  console.log("💾 Writing changes...");
  const results = FileUpdate.collect(updates);
  FileUpdate.writeAll(results, {
    onWrite: (module) => console.log(`  ${URI.relative(module.specifier)}`),
  });
}

function _commit(updates: DependencyUpdate[]) {
  console.log();
  console.log("📝 Committing changes...");
  commitAll(updates, {
    groupBy: (dependency) => dependency.name,
    onCommit: (commit) => console.log(`  ${commit.message}`),
  });
}

const main = new Command()
  .name("molt")
  .description("A tool for updating dependencies in Deno projects")
  .version("0.2.0")
  .command("check", checkCommand)
  .command("update", updateCommand);

await main.parse(Deno.args);
