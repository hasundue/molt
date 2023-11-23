import { distinct, filterKeys, mapEntries } from "./lib/std/collections.ts";
import { parse as parseJsonc } from "./lib/std/jsonc.ts";
import { dirname, extname, join } from "./lib/std/path.ts";
import { colors, Command } from "./lib/x/cliffy.ts";
import { $ } from "./lib/x/dax.ts";
import { ensure, is } from "./lib/x/unknownutil.ts";
import { URI } from "./lib/uri.ts";
import { DependencyUpdate } from "./lib/update.ts";
import { writeAll } from "./lib/file.ts";
import { GitCommitSequence } from "./lib/git.ts";
import * as Dependency from "./lib/dependency.ts";
import { SemVerString } from "./lib/semver.ts";

const { gray, yellow, bold, cyan } = colors;

const main = new Command()
  .name("molt")
  .description("Check updates to dependencies in Deno modules")
  .versionOption("-v, --version", "Print version info.", versionCommand)
  .example("Check updates in a module", "molt deps.ts")
  .example("Include multiple modules", "molt mod.ts lib.ts")
  .example("Target all .ts files", "molt ./**/*.ts")
  .option("--import-map <file:string>", "Specify import map file")
  .example("Specify an import map", "molt mod.ts --import-map deno.json")
  .option("--ignore=<deps:string[]>", "Ignore dependencies", {
    conflicts: ["only"],
  })
  .example(
    "Ignore specified dependencies",
    "molt deps.ts --ignore=deno_graph,node_emoji",
  )
  .option("--only=<deps:string[]>", "Check specified dependencies", {
    conflicts: ["ignore"],
  })
  .example("Check deno_std only", "molt deps.ts --only deno.land/std")
  .option("-w, --write", "Write changes to local files", {
    conflicts: ["commit"],
  })
  .option("-c, --commit", "Commit changes to local git repository", {
    conflicts: ["write"],
  })
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
  .arguments("<modules...:string>")
  .action(async function (options, ...entrypoints) {
    if (options.importMap) {
      if (await $.path(options.importMap).exists() === false) {
        console.error(`Import map ${options.importMap} does not exist.`);
        Deno.exit(1);
      }
    }
    _ensureJsFiles(entrypoints);
    const updates = await _collect(entrypoints, options);
    _list(updates);
    if (options.write) {
      return _write(updates, options);
    }
    if (options.commit) {
      const tasks = await _getTasks();
      return _commit(updates, {
        ...options,
        preCommit: filterKeys(
          tasks,
          (key) => options.preCommit?.includes(key) ?? false,
        ),
        postCommit: filterKeys(
          tasks,
          (key) => options.postCommit?.includes(key) ?? false,
        ),
      });
    }
  });

async function versionCommand() {
  const version = SemVerString.extract(import.meta.url) ??
    await $.progress("Fetching version info").with(async () => {
      const latest = await Dependency.resolveLatestVersion(
        Dependency.parse(new URL("https://deno.land/x/molt/cli.ts")),
      );
      return latest ? latest.version : undefined;
    }) ?? "unknown";
  console.log(version);
}

async function _collect(
  entrypoints: string[],
  options: {
    ignore?: string[];
    importMap?: string;
    only?: string[];
  },
): Promise<DependencyUpdate[]> {
  return await $.progress("Checking for updates").with(async () => {
    const updates = await Promise.all(
      entrypoints.map(async (entrypoint) =>
        await DependencyUpdate.collect(entrypoint, {
          ignore: options.ignore
            ? (dep) => options.ignore!.some((it) => dep.name.includes(it))
            : undefined,
          importMap: options.importMap ?? await _findDenoJson(entrypoint),
          only: options.only
            ? (dep) => options.only!.some((it) => dep.name.includes(it))
            : undefined,
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

function _findDenoJson(entrypoint: string) {
  return _findFileUp(entrypoint, "deno.json", "deno.jsonc");
}

type TaskRecord = Record<string, string[]>;

async function _getTasks() {
  const tasks: TaskRecord = {
    fmt: ["fmt"],
    lint: ["lint"],
    test: ["test"],
  };
  const config = await _findDenoJson(Deno.cwd());
  if (!config) {
    return tasks;
  }
  try {
    const json = ensure(
      parseJsonc(await Deno.readTextFile(config)),
      is.ObjectOf({ tasks: is.Record }),
    );
    return {
      ...tasks,
      ...mapEntries(json.tasks, ([name]) => [name, ["task", "-q", name]]),
    };
  } catch {
    return tasks;
  }
}

function _list(updates: DependencyUpdate[]) {
  console.log(`💡 Found ${updates.length > 1 ? "updates" : "an update"}:`);
  const dependencies = new Map<string, DependencyUpdate[]>();
  for (const u of updates) {
    const list = dependencies.get(u.to.name) ?? [];
    list.push(u);
    dependencies.set(u.to.name, list);
  }
  for (const [name, list] of dependencies.entries()) {
    console.log();
    const froms = distinct(list.map((u) => u.from.version)).join(", ");
    console.log(
      `📦 ${bold(name)} ${yellow(froms)} => ${yellow(list[0].to.version)}`,
    );
    distinct(
      list.map((u) => {
        const source = URI.relative(u.map?.source ?? u.referrer);
        return `  ${source} ` + gray(u.from.version ?? "");
      }),
    ).forEach((line) => console.log(line));
  }
}

async function _write(
  updates: DependencyUpdate[],
  options?: {
    summary?: string;
    report?: string;
  },
) {
  console.log();
  await writeAll(updates, {
    onWrite: (module) => console.log(`💾 ${URI.relative(module.specifier)}`),
  });
  if (options?.summary || options?.report) {
    console.log();
  }
  if (options?.summary) {
    await Deno.writeTextFile(options.summary, "Update dependencies");
    console.log(`📄 ${options.summary}`);
  }
  if (options?.report) {
    const content = distinct(
      updates.map((u) => `- ${u.to.name} ${u.from.version} => ${u.to.version}`),
    ).join("\n");
    await Deno.writeTextFile(options.report, content);
    console.log(`📄 ${options.report}`);
  }
}

async function _commit(
  updates: DependencyUpdate[],
  options: {
    preCommit?: TaskRecord;
    postCommit?: TaskRecord;
    prefix?: string;
    summary?: string;
    report?: string;
  },
) {
  const preCommitTasks = Object.entries(options?.preCommit ?? {});
  const commits = GitCommitSequence.from(updates, {
    groupBy: (dependency) => dependency.to.name,
    composeCommitMessage: ({ group, version }) =>
      _formatPrefix(options.prefix) + `bump ${group}` +
      (version?.from ? ` from ${version?.from}` : "") +
      (version?.to ? ` to ${version?.to}` : ""),
    preCommit: preCommitTasks.length > 0
      ? async (commit) => {
        const tasks = Object.entries(options?.preCommit ?? {});
        console.log(`\n💾 ${commit.message}`);
        for (const t of tasks) {
          await _task(t);
        }
      }
      : undefined,
    postCommit: async (commit) => {
      console.log(`📝 ${commit.message}`);
      for (const task of Object.entries(options?.postCommit ?? {})) {
        await _task(task);
      }
    },
  });
  if (!commits.options.preCommit) {
    console.log();
  }
  await GitCommitSequence.exec(commits);
  if (options?.summary || options?.report) {
    console.log();
  }
  if (options?.summary) {
    await Deno.writeTextFile(options.summary, _summary(commits, options));
    console.log(`📄 ${options.summary}`);
  }
  if (options?.report) {
    await Deno.writeTextFile(options.report, _report(commits));
    console.log(`📄 ${options.report}`);
  }
}

async function _task([name, args]: [string, string[]]) {
  console.log(`🔨 Running task ${cyan(name)}...`);
  const { code } = await new Deno.Command("deno", {
    args,
    stdout: "inherit",
    stderr: "inherit",
  }).output();
  if (code != 0) {
    Deno.exit(code);
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
 * @param files - The name of the files to search for.
 * @returns The first file path found or undefined if no file was found.
 */
async function _findFileUp(entrypoint: string, ...files: string[]) {
  let path = dirname(entrypoint);
  for (;;) {
    for await (const dirEntry of Deno.readDir(path)) {
      if (files.includes(dirEntry.name)) {
        return join(path, dirEntry.name);
      }
    }
    const newPath = dirname(path);
    if (newPath === path) {
      // reached the system root
      return undefined;
    }
    path = newPath;
  }
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
  const full = _formatPrefix(options.prefix) + `update ${groups}`;
  return (full.length <= 50)
    ? full
    : _formatPrefix(options.prefix) + "update dependencies";
}

function _report(sequence: GitCommitSequence): string {
  return sequence.commits.map((commit) => `- ${commit.message}`).join("\n");
}

function _formatPrefix(prefix: string | undefined) {
  return prefix ? prefix.trimEnd() + " " : "";
}

try {
  const env = await Deno.permissions.query({ name: "env" });
  if (env.state === "granted" && Deno.env.get("MOLT_TEST")) {
    const { enableTestMode } = await import("./lib/testing.ts");
    enableTestMode();
  }
  await main.parse(Deno.args);
} catch (error) {
  if (error.message) {
    console.error(error.message);
  }
  Deno.exit(1);
}
