import { assertArrayIncludes } from "./std/assert.ts";
import { assertSpyCall } from "./std/testing.ts";
import { basename, relative } from "./std/path.ts";
import {
  CommandStub,
  FileSystemFake,
  LatestSemVerStub,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { SemVerString } from "./semver.ts";
import { collect } from "./update.ts";
import { commitAll } from "./git.ts";

const normalizePath = (path: string) =>
  Deno.build.os === "windows" ? path.replaceAll("/", "\\") : path;

const LATEST = "123.456.789" as SemVerString;

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

const DIR = "test/data/multiple_modules";

Deno.test("commitAll", async (t) => {
  LatestSemVerStub.create(LATEST);

  const updates = await collect(
    new URL(`../${DIR}/mod.ts`, import.meta.url),
  );

  const cs = CommandStub.create();
  Deno.Command = cs;

  const fs = new FileSystemFake();
  ReadTextFileStub.create(fs, { readThrough: true });
  WriteTextFileStub.create(fs);

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

  await t.step("no grouping", async () => {
    await commitAll(updates);
    assertGitAdd(`${DIR}/lib.ts`, `${DIR}/mod.ts`);
    assertGitCommit("build(deps): update dependencies");
    assertFileSystem(fs);
  });

  fs.clear();

  await t.step("group by dependency name", async () => {
    await commitAll(updates, {
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
    await commitAll(updates, {
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
