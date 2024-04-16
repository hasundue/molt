import { mapEntries } from "@std/collections/map-entries";
import { parse as parseJsonc } from "@std/jsonc";
import { colors } from "@cliffy/ansi";
import { ensure, is } from "@core/unknownutil";
import { findFileUp } from "@molt/lib/path";

const { cyan } = colors;

export type TaskRecord = Record<string, string[]>;

export async function getTasks() {
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

export async function runTask([name, args]: [string, string[]]) {
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
