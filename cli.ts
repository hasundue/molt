import { existsSync } from "./lib/std/fs.ts";
import { distinct } from "./lib/std/collections.ts";
import { parse as parseJsonc } from "./lib/std/jsonc.ts";
import { dirname, extname, join } from "./lib/std/path.ts";
import { colors, Command, Input, List, Select } from "./lib/x/cliffy.ts";
import { $ } from "./lib/x/dax.ts";
import { URI } from "./lib/uri.ts";
import { DependencyUpdate } from "./lib/update.ts";
import { FileUpdate } from "./lib/file.ts";
import { GitCommitSequence } from "./lib/git.ts";

const { gray, yellow, bold, cyan } = colors;

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
  const updates = await _collect(entrypoints, options);
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
      const prefix = await Input.prompt({
        message: "Prefix for commit messages",
        default: "build(deps):",
      });
      const suggestions = _getTasks();
      if (!suggestions.length) {
        return _commit(updates, { prefix });
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
      return _commit(updates, { preCommit, postCommit, prefix });
    }
  }
}

const updateCommand = new Command()
  .description("Update dependencies to the latest version")
  .option("--import-map <file:string>", "Specify import map file")
  .option("--commit", "Commit changes to git")
  .option("--pre-commit=<tasks:string[]>", "Run tasks before each commit", {
    depends: ["commit"],
  })
  .option("--post-commit=<tasks:string[]>", "Run tasks after each commit", {
    depends: ["commit"],
  })
  .option("--prefix <prefix:string>", "Prefix for commit messages", {
    depends: ["commit"],
  })
  .option("--summary <file:string>", "Write a summary of changes to file")
  .option("--report <file:string>", "Write a report of changes to file")
  .arguments("<entrypoints...:string>")
  .action(updateAction);

async function updateAction(
  options: {
    commit?: boolean;
    importMap?: string;
    preCommit?: string[];
    postCommit?: string[];
    prefix?: string;
    summary?: string;
    report?: string;
  },
  ...entrypoints: string[]
) {
  const updates = await _collect(entrypoints, options);
  _list(updates);
  if (options.commit) {
    return _commit(updates, options);
  }
  return _write(updates, options);
}

async function _collect(
  entrypoints: string[],
  options: { importMap?: string },
): Promise<DependencyUpdate[]> {
  return await $.progress("Checking for updates").with(async () => {
    const updates = await Promise.all(
      entrypoints.map(async (entrypoint) =>
        await DependencyUpdate.collect(entrypoint, {
          importMap: options.importMap ?? await _findImportMap(entrypoint),
        })
      ),
    ).then((results) => results.flat());
    if (!updates.length) {
      console.log("🍵 No updates found");
      Deno.exit(0);
    }
    return updates;
  });
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

async function _write(
  updates: DependencyUpdate[],
  options?: {
    summary?: string;
    report?: string;
  },
) {
  const results = await FileUpdate.collect(updates);
  await FileUpdate.writeAll(results, {
    onWrite: (module) => console.log(`💾 ${URI.relative(module.specifier)}`),
  });
  console.log();
  if (options?.summary) {
    await Deno.writeTextFile(options.summary, "Update dependencies");
    console.log(`📄 ${options.summary}`);
  }
  if (options?.report) {
    const content = distinct(
      updates.map((u) => `- ${u.name} ${u.version.from} => ${u.version.to}`),
    ).join("\n");
    await Deno.writeTextFile(options.report, content);
    console.log(`📄 ${options.report}`);
  }
}

async function _commit(
  updates: DependencyUpdate[],
  options: {
    preCommit?: string[];
    postCommit?: string[];
    prefix?: string;
    summary?: string;
    report?: string;
  },
) {
  const commits = GitCommitSequence.from(updates, {
    groupBy: (dependency) => dependency.name,
    composeCommitMessage: ({ group, version }) =>
      _formatPrefix(options.prefix) + `bump ${group}` +
      (version?.from ? ` from ${version?.from}` : "") +
      (version?.to ? ` to ${version?.to}` : ""),
    preCommit: options?.preCommit
      ? async (commit) => {
        console.log(`\n📝 Commiting "${commit.message}"...`);
        for (const task of options?.preCommit ?? []) {
          await _task(task);
        }
      }
      : undefined,
    postCommit: async (commit) => {
      console.log(`📝 ${commit.message}`);
      for (const task of options?.postCommit ?? []) {
        await _task(task);
      }
    },
  });
  await GitCommitSequence.exec(commits);
  console.log();
  if (options?.summary) {
    await Deno.writeTextFile(options.summary, _summary(commits, options));
    console.log(`📄 ${options.summary}`);
  }
  if (options?.report) {
    await Deno.writeTextFile(options.report, _report(commits));
    console.log(`📄 ${options.report}`);
  }
}

async function _task(task: string) {
  console.log(`\n🔨 Running task ${cyan(task)}...`);
  try {
    await $`deno task -q ${task}`;
  } catch {
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

function _summary(
  sequence: GitCommitSequence,
  options: { prefix?: string },
): string {
  if (sequence.commits.length === 0) {
    return "No updates";
  }
  if (sequence.commits.length === 1) {
    return sequence.commits[0].message;
  }
  const groups = sequence.commits.map((commit) => commit.group).join(", ");
  const full = _formatPrefix(options.prefix) + `Update ${groups}`;
  return (full.length <= 50) ? full : _formatPrefix(options.prefix) + "Update dependencies";
}

function _report(sequence: GitCommitSequence): string {
  return sequence.commits.map((commit) => `- ${commit.message}`).join("\n");
}

function _formatPrefix(prefix: string | undefined) {
  return prefix ? prefix.trimEnd() + " " : "";
}

const main = new Command()
  .name("molt")
  .description("A tool for updating dependencies in Deno projects")
  .action(function () {
    this.showHelp();
  })
  .version("0.7.3")
  .command("check", checkCommand)
  .command("update", updateCommand);

await main.parse(Deno.args);
