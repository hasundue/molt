import {
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
  LatestSemVerStub,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { URI } from "./uri.ts";
import { SemVerString } from "./semver.ts";
import { DependencyUpdate } from "./update.ts";
import { commitAll } from "./git.ts";

describe("commitAll()", () => {
  let updates: DependencyUpdate[];
  let fileSystemFake: FileSystemFake;
  let CommandStub: ReturnType<typeof createCommandStub>;
  const LATEST = "123.456.789" as SemVerString;

  beforeAll(async () => {
    LatestSemVerStub.create(LATEST);
    updates = await DependencyUpdate.collect(
      "./test/data/multiple_modules/mod.ts",
    );
    fileSystemFake = new FileSystemFake();
    ReadTextFileStub.create(fileSystemFake, {
      readThrough: true,
    });
    WriteTextFileStub.create(fileSystemFake);
  });

  beforeEach(() => {
    fileSystemFake.clear();
    CommandStub = createCommandStub();
    Deno.Command = CommandStub;
  });

  const expected = [
    `import { assert } from "https://deno.land/std@${LATEST}/assert/assert.ts";
import { createGraph } from "https://deno.land/x/deno_graph@${LATEST}/mod.ts";
import emoji from "npm:node-emoji@${LATEST}";
import { noop } from "./lib.ts";
`,
    `import { assertEquals } from "https://deno.land/std@${LATEST}/assert/assert_equals.ts";
export const noop = () => {};
`,
  ];

  // "git add src/data/mod.ts src/data/lib.ts",
  it("no grouping", async () => {
    await commitAll(updates);
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertGitAdd(CommandStub, "src/data/mod.ts", "src/data/lib.ts");
    assertGitCommit(CommandStub, "build(deps): update dependencies");
    assertSpyCalls(CommandStub, 2);
    assertArrayIncludes(Array.from(fileSystemFake.values()), expected);
  });

  it("group by dependency name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.to.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertGitAdd(CommandStub, "test/data/multiple_modules/mod.ts");
    assertGitCommit(CommandStub, "build(deps): update node-emoji");
    assertGitAdd(CommandStub, "test/data/multiple_modules/mod.ts");
    assertGitCommit(CommandStub, "build(deps): update deno.land/x/deno_graph");
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertGitAdd(CommandStub, "src/data/lib.ts", "src/data/mod.ts");
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
    assertGitAdd(CommandStub, "test/data/multiple_modules/mod.ts");
    assertGitCommit(
      CommandStub,
      `build(deps): update ${
        normalizePath("test/data/multiple_modules/mod.ts")
      }`,
    );
    assertGitAdd(CommandStub, "test/data/multiple_modules/lib.ts");
    assertGitCommit(
      CommandStub,
      `build(deps): update ${
        normalizePath("test/data/multiple_modules/lib.ts")
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
