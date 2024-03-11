import {
  assertArrayIncludes,
  assertEquals,
  assertThrows,
} from "./std/assert.ts";
import { assertSpyCall, describe, it } from "./std/testing.ts";
import { basename, relative } from "./std/path.ts";
import {
  CommandStub,
  FileSystemFake,
  LatestVersionStub,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { collect } from "./update.ts";
import { commit, getVersionChange } from "./git.ts";

//--------------------------------------------------------------------
//
// Unit tests
//
//--------------------------------------------------------------------

describe("getVersionChange", () => {
  it("single version", () => {
    assertEquals(
      getVersionChange([
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.1.0",
          },
        },
        // deno-lint-ignore no-explicit-any
      ] as any),
      {
        from: "0.0.1",
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with different names", () => {
    assertEquals(
      getVersionChange([
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.1.0",
          },
        },
        {
          from: {
            name: "node-emoji",
            version: "0.0.1",
          },
          to: {
            name: "node-emoji",
            version: "0.1.0",
          },
        },
        // deno-lint-ignore no-explicit-any
      ] as any),
      undefined,
    );
  });
  it("multiple versions with different `from`s and a common `to`", () => {
    assertEquals(
      getVersionChange([
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.1.0",
          },
        },
        {
          from: {
            name: "deno_graph",
            version: "0.0.2",
          },
          to: {
            name: "deno_graph",
            version: "0.1.0",
          },
        },
        // deno-lint-ignore no-explicit-any
      ] as any),
      {
        from: undefined,
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with a common `from` and `to`", () => {
    assertEquals(
      getVersionChange([
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.2.0",
          },
        },
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.2.0",
          },
        },
        // deno-lint-ignore no-explicit-any
      ] as any),
      {
        from: "0.0.1",
        to: "0.2.0",
      },
    );
  });
  it("multiple versions with a common `from` and different `to`s", () => {
    assertThrows(() =>
      getVersionChange([
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.1.0",
          },
        },
        {
          from: {
            name: "deno_graph",
            version: "0.0.1",
          },
          to: {
            name: "deno_graph",
            version: "0.2.0",
          },
        },
        // deno-lint-ignore no-explicit-any
      ] as any)
    );
  });
});

//--------------------------------------------------------------------
//
// Integration tests
//
//--------------------------------------------------------------------

Deno.test("commit", async (t) => {
  const DIR = "test/data/multiple_modules";

  const LATEST = "123.456.789";
  LatestVersionStub.create(LATEST);

  const EXPECTED = [
    `import { assert } from "https://deno.land/std@${LATEST}/assert/assert.ts";
import { createGraph } from "https://deno.land/x/deno_graph@${LATEST}/mod.ts";
import emoji from "npm:node-emoji@${LATEST}";
import { noop } from "./lib.ts";
`,
    `import { assertEquals } from "https://deno.land/std@${LATEST}/assert/assert_equals.ts";
export const noop = () => {};
`,
  ];
  const assertFileSystem = (
    fs: FileSystemFake,
  ) => assertArrayIncludes(Array.from(fs.values()), EXPECTED);

  const cs = CommandStub.create();
  Deno.Command = cs;

  const fs = new FileSystemFake();
  ReadTextFileStub.create(fs, { readThrough: true });
  WriteTextFileStub.create(fs);

  const normalizePath = (path: string) =>
    Deno.build.os === "windows" ? path.replaceAll("/", "\\") : path;

  let calls = 0;
  const assertGitAdd = (
    ...paths: string[]
  ) =>
    assertSpyCall(cs, calls++, {
      args: [
        "git",
        { args: ["add", ...paths.map(normalizePath)] },
      ],
    });
  const assertGitCommit = (
    message: string,
  ) =>
    assertSpyCall(cs, calls++, {
      args: [
        "git",
        { args: ["commit", "-m", message] },
      ],
    });

  const result = await collect(
    new URL(`../${DIR}/mod.ts`, import.meta.url),
  );

  await t.step("no grouping", async () => {
    await commit(result);
    assertGitAdd(`${DIR}/lib.ts`, `${DIR}/mod.ts`);
    assertGitCommit("build(deps): update dependencies");
    assertFileSystem(fs);
  });

  fs.clear();

  await t.step("group by dependency name", async () => {
    await commit(result, {
      groupBy: (update) => update.to.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertGitAdd(`${DIR}/lib.ts`, `${DIR}/mod.ts`);
    assertGitCommit("build(deps): update deno.land/std");
    assertGitAdd(`${DIR}/mod.ts`);
    assertGitCommit("build(deps): update deno.land/x/deno_graph");
    assertGitAdd(`${DIR}/mod.ts`);
    assertGitCommit("build(deps): update node-emoji");
    assertFileSystem(fs);
  });

  fs.clear();

  await t.step("group by module (file) name", async () => {
    await commit(result, {
      groupBy: (update) => basename(update.referrer),
      composeCommitMessage: ({ group }) => {
        const path = relative(Deno.cwd(), group);
        return `build(deps): update ${path}`;
      },
    });
    assertGitAdd(`${DIR}/lib.ts`);
    assertGitCommit(`build(deps): update lib.ts`);
    assertGitAdd(`${DIR}/mod.ts`);
    assertGitCommit(`build(deps): update mod.ts`);
    assertFileSystem(fs);
  });
});
