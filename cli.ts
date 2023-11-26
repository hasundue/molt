import { distinct, filterKeys, mapEntries } from "./lib/std/collections.ts";
import { parse as parseJsonc } from "./lib/std/jsonc.ts";
import { extname, relative } from "./lib/std/path.ts";
import { colors, Command } from "./lib/x/cliffy.ts";
import { $ } from "./lib/x/dax.ts";
import { ensure, is } from "./lib/x/unknownutil.ts";
import { findFileUp } from "./lib/path.ts";
import { parse, resolveLatestVersion } from "./lib/dependency.ts";
import {
  collect,
  type CommitSequence,
  createCommitSequence,
  type DependencyUpdate,
  exec,
  writeAll,
} from "./mod.ts";

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
    ensureJsFiles(entrypoints);
    const updates = await collectUpdates(entrypoints, options);
    printUpdates(updates);
    if (options.write) {
      return writeUpdates(updates, options);
    }
    if (options.commit) {
      const tasks = await getTasks();
      return commitUpdates(updates, {
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
  const version = parse(import.meta.url).version ??
    await $.progress("Fetching version info").with(async () =>
      await resolveLatestVersion(
        parse(new URL("https://deno.land/x/molt/cli.ts")),
      ).then((latest) => latest?.version) ?? "unknown"
    );
  console.log(version);
}

async function collectUpdates(
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
        await collect(entrypoint, {
          findImportMap: options.importMap === undefined,
          ignore: options.ignore
            ? (dep) => options.ignore!.some((it) => dep.name.includes(it))
            : undefined,
          importMap: options.importMap,
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

type TaskRecord = Record<string, string[]>;

async function getTasks() {
  const tasks: TaskRecord = {
    fmt: ["fmt"],
    lint: ["lint"],
    test: ["test"],
  };
  const config = await findFileUp(Deno.cwd(), "deno.json", "deno.jsonc");
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

const toRelativePath = (path: string) => relative(Deno.cwd(), path);

function printUpdates(updates: DependencyUpdate[]) {
  const dependencies = new Map<string, DependencyUpdate[]>();
  for (const u of updates) {
    const list = dependencies.get(u.to.name) ?? [];
    list.push(u);
    dependencies.set(u.to.name, list);
  }
  let count = 0;
  for (const [name, list] of dependencies.entries()) {
    const froms = distinct(list.map((u) => u.from.version)).join(", ");
    console.log(
      `📦 ${bold(name)} ${yellow(froms)} => ${yellow(list[0].to.version)}`,
    );
    distinct(
      list.map((u) => {
        const source = toRelativePath(u.map?.source ?? u.referrer);
        return `  ${source} ` + gray(u.from.version ?? "");
      }),
    ).forEach((line) => console.log(line));
    if (++count < dependencies.size) {
      console.log();
    }
  }
}

async function writeUpdates(
  updates: DependencyUpdate[],
  options?: {
    summary?: string;
    report?: string;
  },
) {
  console.log();
  await writeAll(updates, {
    onWrite: (file) => console.log(`💾 ${toRelativePath(file.path)}`),
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

async function commitUpdates(
  updates: DependencyUpdate[],
  options: {
    preCommit?: TaskRecord;
    postCommit?: TaskRecord;
    prefix?: string;
    summary?: string;
    report?: string;
  },
) {
  console.log();

  const preCommitTasks = Object.entries(options?.preCommit ?? {});
  const postCommitTasks = Object.entries(options?.postCommit ?? {});
  const hasTask = preCommitTasks.length > 0 || postCommitTasks.length > 0;

  let count = 0;

  const commits = createCommitSequence(updates, {
    groupBy: (dependency) => dependency.to.name,
    composeCommitMessage: ({ group, version }) =>
      formatPrefix(options.prefix) + `bump ${group}` +
      (version?.from ? ` from ${version?.from}` : "") +
      (version?.to ? ` to ${version?.to}` : ""),
    preCommit: preCommitTasks.length > 0
      ? async (commit) => {
        console.log(`💾 ${commit.message}`);
        for (const t of preCommitTasks) {
          await runTask(t);
        }
      }
      : undefined,
    postCommit: async (commit) => {
      console.log(`📝 ${commit.message}`);
      for (const task of postCommitTasks) {
        await runTask(task);
      }
      if (hasTask && ++count < commits.commits.length) {
        console.log();
      }
    },
  });

  await exec(commits);

  if (options?.summary || options?.report) {
    console.log();
  }
  if (options?.summary) {
    await Deno.writeTextFile(options.summary, createSummary(commits, options));
    console.log(`📄 ${options.summary}`);
  }
  if (options?.report) {
    await Deno.writeTextFile(options.report, createReport(commits));
    console.log(`📄 ${options.report}`);
  }
}

async function runTask([name, args]: [string, string[]]) {
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

function ensureJsFiles(paths: string[]) {
  for (const path of paths) {
    if (!["", ".js", ".ts", ".jsx", ".tsx"].includes(extname(path))) {
      throw new Error(`❌ file must be javascript or typescript: "${path}"`);
    }
    try {
      if (!Deno.statSync(path).isFile) {
        throw new Error(`❌ not a file: "${path}"`);
      }
    } catch {
      throw new Error(`❌ path does not exist: "${path}"`);
    }
  }
}

function createSummary(
  sequence: CommitSequence,
  options: { prefix?: string },
): string {
  if (sequence.commits.length === 0) {
    return "No updates";
  }
  if (sequence.commits.length === 1) {
    return sequence.commits[0].message;
  }
  const groups = sequence.commits.map((commit) => commit.group).join(", ");
  const full = formatPrefix(options.prefix) + `update ${groups}`;
  return (full.length <= 50)
    ? full
    : formatPrefix(options.prefix) + "update dependencies";
}

const createReport = (sequence: CommitSequence): string =>
  sequence.commits.map((commit) => `- ${commit.message}`).join("\n");

const formatPrefix = (prefix: string | undefined) =>
  prefix ? prefix.trimEnd() + " " : "";

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
