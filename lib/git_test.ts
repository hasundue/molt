import {
  afterAll,
  assertSpyCalls,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "./std/testing.ts";
import { assertArrayIncludes } from "./std/assert.ts";
import {
  assertFindSpyCall,
  createCommandStub,
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { URI } from "./uri.ts";
import { DependencyUpdate } from "./update.ts";
import { commitAll } from "./git.ts";

describe("commitAll()", () => {
  let updates: DependencyUpdate[];
  let fileSystemFake: FileSystemFake;
  let writeTextFileStub: WriteTextFileStub;
  let readTextFileStub: ReadTextFileStub;
  let CommandStub: ReturnType<typeof createCommandStub>;

  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./test/fixtures/direct-import/mod.ts",
    );
    fileSystemFake = new FileSystemFake();
    readTextFileStub = ReadTextFileStub.create(fileSystemFake, {
      readThrough: true,
    });
    writeTextFileStub = WriteTextFileStub.create(fileSystemFake);
  });

  afterAll(() => {
    writeTextFileStub.restore();
    readTextFileStub.restore();
    Deno.Command = CommandStub.original;
  });

  beforeEach(() => {
    fileSystemFake.clear();
    CommandStub = createCommandStub();
    Deno.Command = CommandStub;
  });

  const expected = [
    `import { VERSION } from "https://deno.land/std@0.205.0/version.ts";
import { createGraph } from "https://deno.land/x/deno_graph@0.59.2/mod.ts";
import { emojify } from "npm:node-emoji@2.1.0";
import { noop } from "./lib.ts";`,
    `import { VERSION } from "https://deno.land/std@0.205.0/version.ts";
export const noop = () => {};`,
  ];

  // "git add src/fixtures/mod.ts src/fixtures/lib.ts",
  it("no grouping", async () => {
    await commitAll(updates);
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertGitAdd(CommandStub, "src/fixtures/mod.ts", "src/fixtures/lib.ts");
    assertGitCommit(CommandStub, "build(deps): update dependencies");
    assertSpyCalls(CommandStub, 2);
    assertArrayIncludes(Array.from(fileSystemFake.values()), expected);
  });

  it("group by dependency name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertGitAdd(CommandStub, "test/fixtures/direct-import/mod.ts");
    assertGitCommit(CommandStub, "build(deps): update node-emoji");
    assertGitAdd(CommandStub, "test/fixtures/direct-import/mod.ts");
    assertGitCommit(CommandStub, "build(deps): update deno.land/x/deno_graph");
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertGitAdd(CommandStub, "src/fixtures/lib.ts", "src/fixtures/mod.ts");
    assertGitCommit(CommandStub, "build(deps): update deno.land/std");
    assertSpyCalls(CommandStub, 6);
    assertArrayIncludes(Array.from(fileSystemFake.values()), expected);
  });

  it("group by module (file) name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.referrer,
      composeCommitMessage: ({ group }) => {
        const uri = URI.ensure("file")(group);
        const relative = URI.relative(uri);
        return `build(deps): update ${relative}`;
      },
    });
    assertGitAdd(CommandStub, "test/fixtures/direct-import/mod.ts");
    assertGitCommit(
      CommandStub,
      `build(deps): update ${
        normalizePath("test/fixtures/direct-import/mod.ts")
      }`,
    );
    assertGitAdd(CommandStub, "test/fixtures/direct-import/lib.ts");
    assertGitCommit(
      CommandStub,
      `build(deps): update ${
        normalizePath("test/fixtures/direct-import/lib.ts")
      }`,
    );
    assertSpyCalls(CommandStub, 4);
    assertArrayIncludes(Array.from(fileSystemFake.values()), expected);
  });
});

function normalizePath(path: string) {
  return Deno.build.os === "windows" ? path.replaceAll("/", "\\") : path;
}

function assertGitCommit(
  Command: ReturnType<typeof createCommandStub>,
  message: string,
) {
  assertFindSpyCall(Command, {
    args: [
      "git",
      { args: ["commit", "-m", message] },
    ],
  });
}

function assertGitAdd(
  Command: ReturnType<typeof createCommandStub>,
  ...paths: string[]
) {
  assertFindSpyCall(Command, {
    args: [
      "git",
      { args: ["add", ...paths.map(normalizePath)] },
    ],
  });
}
