// deno-lint-ignore-file no-explicit-any

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertArrayIncludes,
  assertEquals,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { Stub, stub } from "https://deno.land/std@0.202.0/testing/mock.ts";
import { collectDependencyUpdateAll, DependencyUpdate } from "../mod.ts";
import { commitAll } from "./mod.ts";

const OriginalDenoCommand = Deno.Command;

class DenoCommandStub {
  static commands: string[] = [];
  constructor(cmd: string, options: { args: string[] }) {
    let command = cmd;
    options.args.forEach((arg) => command += " " + arg);
    DenoCommandStub.commands.push(command);
  }
  output() {
    return { code: 0 };
  }
  static clear() {
    DenoCommandStub.commands = [];
  }
}

describe("commitAll()", () => {
  const output = new Map<string, string>();
  let updates: DependencyUpdate[];
  let writeTextFileStub: Stub;

  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );

    writeTextFileStub = stub(
      Deno,
      "writeTextFile", // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );

    Deno.Command = DenoCommandStub as any;
  });

  afterAll(() => {
    writeTextFileStub.restore();
    Deno.Command = OriginalDenoCommand;
  });

  afterEach(() => {
    DenoCommandStub.clear();
    output.clear();
  });

  it("no grouping", async () => {
    await commitAll(updates);
    assertEquals(
      DenoCommandStub.commands,
      [
        "git add src/fixtures/mod.ts src/fixtures/lib.ts",
        'git commit -m "build(deps): update dependencies"',
      ],
    );
  });

  it("group by dependency name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add src/fixtures/mod.ts",
        'git commit -m "build(deps): update node-emoji"',
        "git add src/fixtures/mod.ts",
        'git commit -m "build(deps): update deno.land/x/deno_graph"',
        // "git add src/fixtures/lib.ts src/fixtures/mod.ts",
        'git commit -m "build(deps): update deno.land/std"',
      ],
    );
  });

  it("group by module (file) name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.referrer,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add src/fixtures/mod.ts",
        'git commit -m "build(deps): update src/fixtures/mod.ts"',
        "git add src/fixtures/lib.ts",
        'git commit -m "build(deps): update src/fixtures/lib.ts"',
      ],
    );
  });
});
