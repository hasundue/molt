import { as, ensure, is } from "@core/unknownutil";
import { colors } from "@cliffy/ansi/colors";
import $ from "@david/dax";
import { associateWith, mapEntries } from "@std/collections";
import { parse as parseJsonc } from "@std/jsonc";
import { mergeReadableStreams, toText } from "@std/streams";

export type TaskRecord = Partial<Record<string, string[]>>;

const DEFAULT_TASKS = ["fmt", "lint", "test"] as const;

async function getTasks(config?: string): Promise<TaskRecord> {
  const tasks: TaskRecord = associateWith(
    DEFAULT_TASKS,
    (name) => config ? [name, "--config", config] : [name, "--no-config"],
  );
  if (!config) {
    return tasks;
  }
  const json = ensure(
    parseJsonc(await Deno.readTextFile(config)),
    is.ObjectOf({ tasks: as.Optional(is.RecordOf(is.String, is.String)) }),
  );
  return {
    ...tasks,
    ...mapEntries(
      json.tasks ?? {},
      ([name]) => [name, ["task", "--config", config, name]],
    ),
  };
}

const { cyan } = colors;

async function runTask([name, args]: [string, string[]]) {
  const cmd = new Deno.Command("deno", {
    args,
    stdout: "piped",
    stderr: "piped",
  });
  const child = cmd.spawn();
  const output = mergeReadableStreams(child.stdout, child.stderr);

  const { code } = await $.progress(`Running task ${cyan(name)}...`)
    .with(() => child.status);

  if (code !== 0) {
    console.log(await toText(output));
    Deno.exit(code);
  }
  await output.cancel();
}

export async function runTasks(
  names: string[],
  config?: string,
) {
  const tasks = await getTasks(config);
  for (const name of names) {
    const task = tasks[name];
    if (!task) {
      console.error(`Unknown task: ${name}`);
      Deno.exit(1);
    }
    await runTask([name, task]);
  }
}
