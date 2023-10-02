// deno-lint-ignore-file no-explicit-any

import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
  type Stub,
  stub,
} from "../lib/std/testing.ts";
import { assertArrayIncludes, assertEquals } from "../lib/std/assert.ts";
import { URI } from "../lib/uri.ts";
import { DependencyUpdate } from "../mod.ts";
import { commitAll } from "./mod.ts";

const DenoCommandOriginal = Deno.Command;
const readTextFileSyncOriginal = Deno.readTextFileSync;

class DenoCommandStub {
  static commands: string[] = [];
  constructor(cmd: string, options: { args: string[] }) {
    let command = cmd;
    options.args.forEach((arg) => {
      command += arg.includes(" ") ? ` "${arg}"` : ` ${arg}`;
    });
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

  beforeAll(async () => {
    updates = await DependencyUpdate.collect("./tests/direct-import/mod.ts");
    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync",
      (path, data) => {
        output.push({
          path: path.toString(),
          content: data.toString(),
        });
      },
    );
    readTextFileSyncStub = stub(
      Deno,
      "readTextFileSync",
      (path) => {
        const file = output.findLast((file) => file.path === path.toString());
        return file!.content;
      },
    );
    Deno.Command = DenoCommandStub as any;
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
    readTextFileSyncStub.restore();
    Deno.Command = DenoCommandOriginal;
  });

  beforeEach(() => {
    for (
      const file of [
        "./tests/direct-import/mod.ts",
        "./tests/direct-import/lib.ts",
      ]
    ) {
      const content = readTextFileSyncOriginal(file);
      Deno.writeTextFileSync(new URL(URI.from(file)), content);
    }
  });

  afterEach(() => {
    DenoCommandStub.clear();
    output = [];
  });

  it("no grouping", () => {
    commitAll(updates);
    assertEquals(DenoCommandStub.commands.length, 2);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        // "git add src/fixtures/mod.ts src/fixtures/lib.ts",
        'git commit -m "build(deps): update dependencies"',
      ],
    );
  });

  it("group by dependency name", () => {
    commitAll(updates, {
      groupBy: (update) => update.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertEquals(DenoCommandStub.commands.length, 6);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add tests/direct-import/mod.ts",
        'git commit -m "build(deps): update node-emoji"',
        "git add tests/direct-import/mod.ts",
        'git commit -m "build(deps): update deno.land/x/deno_graph"',
        // "git add tests/direct-import/mod.ts tests/direct-import/lib.ts",
        'git commit -m "build(deps): update deno.land/std"',
      ],
    );
  });

  it("group by module (file) name", () => {
    commitAll(updates, {
      groupBy: (update) => URI.relative(update.referrer),
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertEquals(DenoCommandStub.commands.length, 4);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add tests/direct-import/mod.ts",
        'git commit -m "build(deps): update tests/direct-import/mod.ts"',
        "git add tests/direct-import/lib.ts",
        'git commit -m "build(deps): update tests/direct-import/lib.ts"',
      ],
    );
  });
});
