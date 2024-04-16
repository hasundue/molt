import { Command } from "@cliffy/command";
import $ from "@david/dax";

const main = new Command()
  .name("molt")
  .description(
    "Check updates to dependencies in Deno modules and configuration files",
  )
  .versionOption("-v, --version", "Print version info", versionCommand)
  .option("-w, --write", "Write changes to local files", {
    conflicts: ["commit"],
  })
  .option("-c, --commit", "Commit changes to local git repository", {
    conflicts: ["write"],
  })
  .option(
    "--changelog=[commit_types:string[]]",
    "Show a curated changelog for each update",
  )
  .option("--debug", "Print debug information")
  .option("--import-map <file:string>", "Specify import map file")
  .option("--ignore=<deps:string[]>", "Ignore dependencies")
  .option("--only=<deps:string[]>", "Check specified dependencies")
  .option("--pre-commit=<tasks:string[]>", "Run tasks before each commit", {
    depends: ["commit"],
  })
  .option("--prefix <prefix:string>", "Prefix for commit messages", {
    depends: ["commit"],
  })
  .option(
    "--prefix-lock <prefix:string>",
    "Prefix for commit messages of updating a lock file",
    { depends: ["commit", "unstable-lock"] },
  )
  .option(
    "--unstable-lock [file:string]",
    "Enable unstable updating of a lock file",
  )
  .arguments("<modules...:string>")
  .action(async function (options, ...files) {
    if (
      options.importMap && await $.path(options.importMap).exists() === false
    ) {
      throw new Error(`Import map ${options.importMap} does not exist.`);
    }
    ensureFiles(files);
    const updates = await import("./modules/collect.ts").then((mod) =>
      mod.default(files, options)
    );
    await import("./modules/print.ts").then((mod) =>
      mod.default(files, updates, options)
    );
    if (options.write) {
      await import("./modules/write.ts").then((mod) => mod.default(updates));
    }
    if (options.commit) {
      const tasks = await import("./modules/tasks.ts").then((mod) =>
        mod.getTasks()
      );
      const { filterKeys } = await import("@std/collections/filter-keys");
      await import("./modules/commit.ts").then((mod) =>
        mod.default(updates, {
          ...options,
          preCommit: filterKeys(
            tasks,
            (key) => options.preCommit?.includes(key) ?? false,
          ),
        })
      );
    }
  });

async function versionCommand() {
  const { default: configs } = await import("./deno.json", {
    with: { type: "json" },
  });
  console.log(configs.version);
}

function ensureFiles(paths: string[]) {
  for (const path of paths) {
    try {
      if (!Deno.statSync(path).isFile) {
        throw new Error(`Not a valid file: "${path}"`);
      }
    } catch {
      throw new Error(`Path does not exist: "${path}"`);
    }
  }
}

if (import.meta.main) {
  const debug = Deno.args.includes("--debug");
  try {
    const env = await Deno.permissions.query({ name: "env" });
    if (env.state === "granted" && Deno.env.get("MOLT_TEST")) {
      (await import("./modules/testing.ts")).default();
    }
    await main.parse(Deno.args);
  } catch (error) {
    if (debug) {
      throw error;
    }
    if (error.message) {
      console.error("Error: " + error.message);
    }
    Deno.exit(1);
  }
}
