import {
  afterAll,
  assertSpyCalls,
  beforeAll,
  beforeEach,
  ConstructorSpy,
  describe,
  it,
  type Stub,
  stub,
} from "./std/testing.ts";
import { URI } from "./uri.ts";
import { DependencyUpdate } from "./update.ts";
import { commitAll } from "./git.ts";
import { createCommandStub, assertSomeSpyCall } from "./testing.ts";

const readTextFileOriginal = Deno.readTextFile;

function normalizePath(path: string) {
  return Deno.build.os === "windows" ? path.replaceAll("/", "\\") : path;
}

describe("commitAll()", () => {
  let CommandStub: ConstructorSpy;
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
  });

  afterAll(() => {
    writeTextFileStub.restore();
    readTextFileStub.restore();
    Deno.Command = CommandStub.original;
  });

  beforeEach(async () => {
    CommandStub = createCommandStub();
    Deno.Command = CommandStub;
    output = [];
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

  // "git add src/fixtures/mod.ts src/fixtures/lib.ts",
  it("no grouping", async () => {
    await commitAll(updates);
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertSomeSpyCall(CommandStub, {
    //   args: [
    //     "git",
    //     { args: ["add", "src/fixtures/mod.ts", "src/fixtures/lib.ts"] },
    //   ],
    // });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["commit", "-m", "build(deps): update dependencies"] },
      ],
    });
    assertSpyCalls(CommandStub, 2);
  });

  it("group by dependency name", async () => {
    await commitAll(updates, {
      groupBy: (update) => update.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["add", normalizePath("test/fixtures/direct-import/mod.ts")] },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["commit", "-m", "build(deps): update node-emoji"] },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["add", normalizePath("test/fixtures/direct-import/mod.ts")] },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        {
          args: ["commit", "-m", "build(deps): update deno.land/x/deno_graph"],
        },
      ],
    });
    // TODO: Can't test this because of the order of targets is not guaranteed.
    // assertSomeSpyCall(CommandStub, {
    //   args: [
    //     "git",
    //     {
    //       args: [
    //         "add",
    //         normalizePath("test/fixtures/direct-import/mod.ts"),
    //         normalizePath("test/fixtures/direct-import/lib.ts"),
    //       ],
    //     },
    //   ],
    // });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["commit", "-m", "build(deps): update deno.land/std"] },
      ],
    });
    assertSpyCalls(CommandStub, 6);
  });

  it("group by module (file) name", async () => {
    await commitAll(updates, {
      groupBy: (update) => URI.relative(update.referrer),
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["add", normalizePath("test/fixtures/direct-import/mod.ts")] },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        {
          args: [
            "commit",
            "-m",
            normalizePath(
              "build(deps): update test/fixtures/direct-import/mod.ts",
            ),
          ],
        },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        { args: ["add", normalizePath("test/fixtures/direct-import/lib.ts")] },
      ],
    });
    assertSomeSpyCall(CommandStub, {
      args: [
        "git",
        {
          args: [
            "commit",
            "-m",
            normalizePath(
              "build(deps): update test/fixtures/direct-import/lib.ts",
            ),
          ],
        },
      ],
    });
    assertSpyCalls(CommandStub, 4);
  });
});
