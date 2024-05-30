import { all, cmd, fs } from "@chiezo/amber";
import {
  assertArrayIncludes,
  assertEquals,
  assertObjectMatch,
  assertThrows,
} from "@std/assert";
import { EOL } from "@std/fs/eol";
import * as Jsonc from "@std/jsonc";
import { basename, relative } from "@std/path";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "@std/testing/bdd";
import { assertSpyCall } from "@std/testing/mock";
import { commit, getVersionChange } from "./git.ts";
import { collect, type CollectResult } from "./update.ts";
import { LatestVersionStub } from "../test/mock.ts";

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

describe("commit", () => {
  const DIR = "test/fixtures";
  const LATEST = "123.456.789";

  let calls: number;
  let git: cmd.Stub<"git">;
  let result: CollectResult;
  let vers: LatestVersionStub;

  const normalizePath = (path: string) =>
    Deno.build.os === "windows" ? path.replaceAll("/", "\\") : path;

  const assertGitAdd = (
    ...paths: string[]
  ) =>
    assertSpyCall(git, calls++, {
      args: [
        "git",
        { args: ["add", ...paths.map(normalizePath)] },
      ],
    });

  const assertGitCommit = (
    message: string,
  ) =>
    assertSpyCall(git, calls++, {
      args: [
        "git",
        { args: ["commit", "-m", message] },
      ],
    });

  const assertFileSystem = async () => {
    assertArrayIncludes(
      (await Deno.readTextFile(
        new URL(`../${DIR}/mod_test.ts`, import.meta.url),
      ))
        .split(EOL).filter((line) => line.startsWith("import")),
      [
        'import { assertEquals } from "jsr:@std/assert@123.456.789";',
        'import { describe, it } from "@std/testing/bdd";',
        'import { createGraph } from "./mod.ts";',
      ],
    );
    assertArrayIncludes(
      (await Deno.readTextFile(new URL(`../${DIR}/mod.ts`, import.meta.url)))
        .split(EOL).filter((line) => line.startsWith("export")),
      [
        'export { createGraph } from "https://deno.land/x/deno_graph@123.456.789/mod.ts";',
      ],
    );
    assertObjectMatch(
      Jsonc.parse(
        await Deno.readTextFile(
          new URL(`../${DIR}/deno.jsonc`, import.meta.url),
        ),
        // deno-lint-ignore no-explicit-any
      ) as any,
      {
        imports: {
          "@octokit/core": "npm:@octokit/core@6.1.0",
          "@std/assert": "jsr:@std/assert@0.222.0",
          "@std/bytes": "jsr:@std/bytes",
          "@std/jsonc": "jsr:@std/jsoc@0.222.x",
          "@std/testing": "jsr:@std/testing@^0.222.0",
          "@std/testing/bdd": "jsr:@std/testing@123.456.789/bdd",
          "@std/yaml": "jsr:@std/yaml@123.456.789",
          "lib/": "./lib/",
          "x/deno_graph": "https://deno.land/x/deno_graph@0.50.0/mod.ts",
          "std/": "https://deno.land/std@0.222.0/",
          "std/assert": "https://deno.land/std/assert/mod.ts",
        },
      },
    );
  };

  beforeAll(() => {
    vers = LatestVersionStub.create(LATEST);
  });

  beforeEach(async () => {
    calls = 0;
    fs.stub(DIR);
    git = cmd.stub("git");
    all(cmd, fs).mock();
    result = await collect(new URL(`../${DIR}/mod_test.ts`, import.meta.url), {
      importMap: new URL(`../${DIR}/deno.jsonc`, import.meta.url),
    });
  });

  afterEach(() => {
    all(cmd, fs).dispose();
  });

  afterAll(() => {
    vers.restore();
  });

  it("no grouping", async () => {
    await commit(result);
    assertGitAdd(`${DIR}/deno.jsonc`, `${DIR}/mod_test.ts`, `${DIR}/mod.ts`);
    assertGitCommit("build(deps): update dependencies");
    await assertFileSystem();
  });

  it("group by dependency name", async () => {
    await commit(result, {
      groupBy: (update) => update.to.name,
      composeCommitMessage: ({ group }) => `build(deps): update ${group}`,
    });
    assertGitAdd(`${DIR}/mod_test.ts`);
    assertGitCommit("build(deps): update @std/assert");
    assertGitAdd(`${DIR}/deno.jsonc`);
    assertGitCommit("build(deps): update @std/testing");
    assertGitAdd(`${DIR}/mod.ts`);
    assertGitCommit("build(deps): update deno.land/x/deno_graph");
    await assertFileSystem();
  });

  it("group by module (file) name", async () => {
    await commit(result, {
      groupBy: (update) => basename(update.referrer),
      composeCommitMessage: ({ group }) => {
        const path = relative(Deno.cwd(), group);
        return `build(deps): update ${path}`;
      },
    });
    assertGitAdd(`${DIR}/deno.jsonc`, `${DIR}/mod_test.ts`);
    assertGitCommit(`build(deps): update mod_test.ts`);
    assertGitAdd(`${DIR}/mod.ts`);
    assertGitCommit(`build(deps): update mod.ts`);
    await assertFileSystem();
  });
});
