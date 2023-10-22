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
} from "./std/testing.ts";
import { assertArrayIncludes, assertEquals } from "./std/assert.ts";
import { URI } from "./uri.ts";
import { DependencyUpdate } from "./update.ts";
import { commitAll } from "./git.ts";

const DenoCommandOriginal = Deno.Command;
const readTextFileOriginal = Deno.readTextFile;

class DenoCommandStub {
  static commands: string[] = [];
  constructor(cmd: string, options: { args: string[] }) {
    let command = cmd;
    options.args.forEach((arg) => {
      command += arg.includes(" ") ? ` "${arg}"` : ` ${arg}`;
    });
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
  let output: { path: string; content: string }[] = [];
  let updates: DependencyUpdate[];
  let writeTextFileStub: Stub;
  let readTextFileStub: Stub;

  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./test/fixtures/direct-import/mod.ts",
    );
    writeTextFileStub = stub(
      Deno,
      "writeTextFile",
      // deno-lint-ignore require-await
      async (path, data) => {
        output.push({
          path: path.toString(),
          content: data.toString(),
        });
      },
    );
    readTextFileStub = stub(
      Deno,
      "readTextFile",
      // deno-lint-ignore require-await
      async (path) => {
        const file = output.findLast((file) => file.path === path.toString());
        return file!.content;
      },
    );
    Deno.Command = DenoCommandStub as any;
  });

  afterAll(() => {
    writeTextFileStub.restore();
    readTextFileStub.restore();
    Deno.Command = DenoCommandOriginal;
  });

  beforeEach(async () => {
    for (
      const file of [
        "./test/fixtures/direct-import/mod.ts",
        "./test/fixtures/direct-import/lib.ts",
      ]
    ) {
      const content = await readTextFileOriginal(file);
      await Deno.writeTextFile(new URL(URI.from(file)), content);
    }
  });

  afterEach(() => {
    DenoCommandStub.clear();
    output = [];
  });

  it("no grouping", async () => {
    await commitAll(updates);
    assertEquals(DenoCommandStub.commands.length, 2);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        // "git add src/fixtures/mod.ts src/fixtures/lib.ts",
        'git commit -m "build(deps): update dependencies"',
      ],
    );
  });

  it("group by dependency name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertEquals(DenoCommandStub.commands.length, 6);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add test/fixtures/direct-import/mod.ts",
        'git commit -m "build(deps): update node-emoji"',
        "git add test/fixtures/direct-import/mod.ts",
        'git commit -m "build(deps): update deno.land/x/deno_graph"',
        // "git add test/fixtures/direct-import/mod.ts test/fixtures/direct-import/lib.ts",
        'git commit -m "build(deps): update deno.land/std"',
      ],
    );
  });

  it("group by module (file) name", async () => {
    await commitAll(updates, {
      groupBy: (update) => URI.relative(update.referrer),
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertEquals(DenoCommandStub.commands.length, 4);
    assertArrayIncludes(
      DenoCommandStub.commands,
      [
        "git add test/fixtures/direct-import/mod.ts",
        'git commit -m "build(deps): update test/fixtures/direct-import/mod.ts"',
        "git add test/fixtures/direct-import/lib.ts",
        'git commit -m "build(deps): update test/fixtures/direct-import/lib.ts"',
      ],
    );
  });
});
