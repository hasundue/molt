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
  const updates = await DependencyUpdate.collect(entrypoints, {
    importMap: options.importMap ?? _findImportMap(),
  });
  if (!updates.length) {
    console.log("🍵 No updates found");
    return;
  }
  _list(updates);
  const action = await Select.prompt({
    message: "Choose an action",
    options: [
      { name: "Abort", value: "abort" },
      { name: "Write changes to local files", value: "write" },
      { name: "Commit changes to git", value: "commit" },
    ],
  });
  switch (action) {
    case "abort":
      return;
    case "write":
      return _write(updates);
    case "commit": {
      const test = await Select.prompt({
        message: "Run `deno task test` before each commit?",
        options: [
          { name: "Yes", value: true },
          { name: "No", value: false },
        ],
      });
      return _commit(updates, { test });
    }
  }
}

const updateCommand = new Command()
  .description("Update dependencies to the latest version")
  .option("--import-map <file:string>", "Specify import map file")
  .option("--commit", "Commit changes to git")
  .option("--test", "Run `deno task test` before each commit", {
    depends: ["commit"],
  })
  .arguments("<entrypoints...:string>")
  .action(updateAction);

async function updateAction(
  options: { commit?: boolean; importMap?: string; test?: boolean },
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
  _list(updates);
  if (options.commit) {
    return _commit(updates, options);
  }
  return _write(updates);
}

function _findImportMap(): string | undefined {
  return ["./import_map.json", "./deno.json", "./deno.jsonc"]
    .find((path) => existsSync(path));
}

function _list(updates: DependencyUpdate[]) {
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
  console.log("Writing changes...");
  const results = FileUpdate.collect(updates);
  FileUpdate.writeAll(results, {
    onWrite: (module) => console.log(`  💾 ${URI.relative(module.specifier)}`),
  });
}

function _commit(
  updates: DependencyUpdate[],
  options?: { test?: boolean },
) {
  console.log();
  console.log("Committing changes...");
  commitAll(updates, {
    groupBy: (dependency) => dependency.name,
    preCommit: options?.test
      ? (commit) => {
        const { group, version } = commit;
        const target = group + (version ? `@${version!.to}` : "");
        _print(`\n🧪 Running tests for ${target}...`);
        const { code, stderr } = new Deno.Command(Deno.execPath(), {
          args: ["task", "test"],
        }).outputSync();
        if (code !== 0) {
          console.error(stderr);
          Deno.exit(1);
        }
        console.log("OK");
      }
      : undefined,
    postCommit: (commit) => {
      console.log(`📝 ${commit.message}`);
    },
  });
}

function _print(text: string): void {
  Deno.stdout.writeSync(new TextEncoder().encode(text));
}

const main = new Command()
  .name("molt")
  .description("A tool for updating dependencies in Deno projects")
  .version("0.2.0")
  .command("check", checkCommand)
  .command("update", updateCommand);

await main.parse(Deno.args);
