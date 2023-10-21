import { existsSync } from "./lib/std/fs.ts";
import { distinct } from "./lib/std/collections.ts";
import { parse as parseJsonc } from "./lib/std/jsonc.ts";
import { dirname, extname, join } from "./lib/std/path.ts";
import { colors, Command, List, Select } from "./lib/x/cliffy.ts";
import { URI } from "./lib/uri.ts";
import { DependencyUpdate, FileUpdate } from "./mod.ts";
import { commitAll } from "./git.ts";

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
  _ensureJsFiles(entrypoints);
  console.log("🔎 Checking for updates...");
  const updates = await Promise.all(
    entrypoints.map(async (entrypoint) =>
      await DependencyUpdate.collect(entrypoint, {
        importMap: options.importMap ?? await _findImportMap(entrypoint),
      })
    ),
  ).then((results) => results.flat());
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
      const suggestions = _getTasks();
      if (!suggestions.length) {
        return _commit(updates);
      }
      const preCommit = await List.prompt(
        {
          message: "Tasks to run before each commit (comma separated)",
          suggestions,
        },
      );
      const postCommit = await List.prompt(
        {
          message: "Tasks to run after each commit (comma separated)",
          suggestions,
        },
      );
      return _commit(updates, { preCommit, postCommit });
    }
  }
}

const updateCommand = new Command()
  .description("Update dependencies to the latest version")
  .option("--import-map <file:string>", "Specify import map file")
  .option("--commit", "Commit changes to git")
  .option("--pre-commit <tasks...:string>", "Run tasks before each commit", {
    depends: ["commit"],
  })
  .option("--post-commit <tasks...:string>", "Run tasks after each commit", {
    depends: ["commit"],
  })
  .arguments("<entrypoints...:string>")
  .action(updateAction);

async function updateAction(
  options: {
    commit?: boolean;
    importMap?: string;
    preCommit?: string[];
    postCommit?: string[];
  },
  ...entrypoints: string[]
) {
  console.log("🔎 Checking for updates...");
  const updates = await Promise.all(
    entrypoints.map(async (entrypoint) =>
      await DependencyUpdate.collect(entrypoint, {
        importMap: options.importMap ?? await _findImportMap(entrypoint),
      })
    ),
  ).then((results) => results.flat());
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

async function _findImportMap(entrypoint: string): Promise<string | undefined> {
  const map = [
    await _findFileUp(entrypoint, "deno.json"),
    await _findFileUp(entrypoint, "deno.jsonc"),
  ].flat();

  if (map.length === 0) return;
  return map[0];
}

function _getTasks(): string[] {
  const path = ["./deno.json", "./deno.jsonc"].find((path) => existsSync(path));
  if (!path) {
    return [];
  }
  try {
    // deno-lint-ignore no-explicit-any
    const json = parseJsonc(Deno.readTextFileSync(path)) as any;
    return Object.keys(json.tasks ?? {});
  } catch {
    return [];
  }
}

function _list(updates: DependencyUpdate[]) {
  console.log(`💡 Found ${updates.length > 1 ? "updates" : "an update"}:`);
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
  options?: {
    preCommit?: string[];
    postCommit?: string[];
  },
) {
  console.log("\nCommitting changes...");
  commitAll(updates, {
    groupBy: (dependency) => dependency.name,
    preCommit: () => {
      options?.preCommit?.forEach((task) => _task(task));
    },
    postCommit: (commit) => {
      console.log(`📝 ${commit.message}`);
      options?.postCommit?.forEach((task) => _task(task));
    },
  });
}

function _task(task: string): void {
  const { code, stderr } = new Deno.Command(Deno.execPath(), {
    args: ["task", task],
  }).outputSync();
  if (code !== 0) {
    console.error(new TextDecoder().decode(stderr));
    Deno.exit(1);
  }
}

function _ensureJsFiles(paths: string[]) {
  let errors = 0;
  for (const path of paths) {
    const ext = extname(path);
    if (
      !(ext === "" || ext === ".js" || ext === ".ts" || ext === ".jsx" ||
        ext === ".tsx")
    ) {
      console.error(`❌ file must be javascript or typescript: "${path}"`);
      errors += 1;
      continue;
    }
    try {
      if (!Deno.statSync(path).isFile) {
        console.error(`❌ not a file: "${path}"`);
        errors += 1;
      }
    } catch {
      console.error(`❌ path does not exist: "${path}"`);
      errors += 1;
    }
  }
  if (errors != 0) Deno.exit(1);
}

/**
 * Recursively searches for a file with the specified name in parent directories
 * starting from the given entrypoint directory.
 *
 * @param entrypoint - The file to start the search from its parent dir.
 * @param root - The name of the file to search for.
 * @returns An array of matching file paths found
 */
async function _findFileUp(entrypoint: string, root: string) {
  let path = dirname(entrypoint);
  const hits = [];

  upLoop:
  while (true) {
    for await (const dirEntry of Deno.readDir(path)) {
      if (dirEntry.name === root) hits.push(join(path, dirEntry.name));
    }
    const newPath = dirname(path);
    if (newPath === path) {
      // reached the end of the up loop
      break upLoop;
    }
    path = newPath;
  }

  return hits;
}

const main = new Command()
  .name("molt")
  .description("A tool for updating dependencies in Deno projects")
  .action(function () {
    this.showHelp();
  })
  .version("0.4.5")
  .command("check", checkCommand)
  .command("update", updateCommand);

await main.parse(Deno.args);
