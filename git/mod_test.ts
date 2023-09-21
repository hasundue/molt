// deno-lint-ignore-file no-explicit-any

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
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
import { log } from "../src/utils.ts";

const OriginalDenoCommand = Deno.Command;
const readTextFileSyncOriginal = Deno.readTextFileSync;

class DenoCommandStub {
  static commands: string[] = [];
  constructor(cmd: string, options: { args: string[] }) {
    let command = cmd;
    options.args.forEach((arg) => command += " " + arg);
    DenoCommandStub.commands.push(command);
  }
  outputSync() {
    return { code: 0 };
  }
  static clear() {
    DenoCommandStub.commands = [];
  }
}

describe("commitAll()", () => {
  let output: { path: string; content: string }[] = [];
  let updates: DependencyUpdate[];
  let writeTextFileSyncStub: Stub;
  let readTextFileSyncStub: Stub;

  function debugOutput() {
    for (const { path, content } of output) {
      log.debug(path);
      log.debug(content);
    }
  }

  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );

    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync",
      (path, data) => {
        output.push({ path: path.toString(), content: data.toString() });
      },
    );

    readTextFileSyncStub = stub(
      Deno,
      "readTextFileSync",
      (path) => {
        const file = output.findLast((file) => file.path === path);
        return file!.content;
      },
    );

    Deno.Command = DenoCommandStub as any;
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
    readTextFileSyncStub.restore();
    Deno.Command = OriginalDenoCommand;
  });

  beforeEach(() => {
    for (const file of ["src/fixtures/mod.ts", "src/fixtures/lib.ts"]) {
      const content = readTextFileSyncOriginal(file);
      Deno.writeTextFileSync(file, content);
    }
  });

  afterEach(() => {
    DenoCommandStub.clear();
    output = [];
  });

  it("no grouping", () => {
    commitAll(updates);
    assertEquals(
      DenoCommandStub.commands,
      [
        "git add src/fixtures/mod.ts src/fixtures/lib.ts",
        'git commit -m "build(deps): update dependencies"',
      ],
    );
    debugOutput();
  });

  it("group by dependency name", () => {
    commitAll(updates, {
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
    debugOutput();
  });

  it("group by module (file) name", () => {
    commitAll(updates, {
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
    debugOutput();
  });
});
