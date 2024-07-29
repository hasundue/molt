import { all, cmd, fs } from "@chiezo/amber";
import { assertEquals } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg } from "@std/testing/mock";
import dedent from "dedent";
import { collect, commit, rewrite } from "./refs.ts";

describe("collect", () => {
  beforeEach(() => fs.mock());
  afterEach(() => fs.dispose());

  it("should collect dependencies from an ES module", async () => {
    await Deno.writeTextFile(
      "a.ts",
      dedent`
        import { assert } from "jsr:@std/assert@0.222.0";
        import { copy } from "https://deno.land/std@0.222.0/bytes/copy.ts";
      `,
    );
    const actual = await collect("a.ts");
    assertEquals(actual, [
      {
        dependency: {
          kind: "jsr",
          name: "@std/assert",
          constraint: "0.222.0",
        },
        source: {
          kind: "esm",
          path: "a.ts",
          span: {
            start: { line: 0, character: 23 },
            end: { line: 0, character: 48 },
          },
        },
      },
      {
        dependency: {
          kind: "https",
          name: "deno.land/std",
          constraint: "0.222.0",
          path: "/bytes/copy.ts",
        },
        source: {
          kind: "esm",
          path: "a.ts",
          span: {
            start: { line: 1, character: 21 },
            end: { line: 1, character: 66 },
          },
        },
      },
    ]);
  });

  it("should collect dependencies from an import map", async () => {
    await Deno.writeTextFile(
      "a.json",
      dedent`
        {
          "imports": {
            "@std/assert": "jsr:@std/assert@^0.222.0",
            "@std/testing/bdd": "jsr:@std/testing@^0.222.0/bdd",
          }
        }
      `,
    );
    const actual = await collect("a.json");
    assertEquals(actual, [
      {
        dependency: {
          kind: "jsr",
          name: "@std/assert",
          constraint: "^0.222.0",
        },
        source: {
          kind: "import_map",
          path: "a.json",
          key: "@std/assert",
        },
      },
      {
        dependency: {
          kind: "jsr",
          name: "@std/testing",
          constraint: "^0.222.0",
          path: "/bdd",
        },
        source: {
          kind: "import_map",
          path: "a.json",
          key: "@std/testing/bdd",
        },
      },
    ]);
  });

  it("should collect dependencies from scopes in an import map", async () => {
    await Deno.writeTextFile(
      "a.json",
      dedent`
        {
          "imports": {
            "@std/assert": "jsr:@std/assert@^0.222.0",
          },
          "scopes": {
            "./": {
              "@std/testing": "jsr:@std/testing@^0.222.0",
            }
          }
        }
      `,
    );
    const actual = await collect("a.json");
    assertEquals(actual, [
      {
        dependency: {
          kind: "jsr",
          name: "@std/assert",
          constraint: "^0.222.0",
        },
        source: {
          kind: "import_map",
          path: "a.json",
          key: "@std/assert",
        },
      },
      {
        dependency: {
          kind: "jsr",
          name: "@std/testing",
          constraint: "^0.222.0",
        },
        source: {
          kind: "import_map",
          path: "a.json",
          key: "@std/testing",
          scope: "./",
        },
      },
    ]);
  });
});

describe("rewrite", () => {
  beforeEach(() => fs.mock());
  afterEach(() => fs.dispose());

  it("should rewrite dependencies in an ES module", async () => {
    await Deno.writeTextFile(
      "a.ts",
      dedent`
        import { assert } from "jsr:@std/assert@0.222.0";
        import { copy } from "https://deno.land/std@0.222.0/bytes/copy.ts";
      `,
    );
    const refs = await collect("a.ts");
    await rewrite(refs[0], "0.224.0");
    assertEquals(
      await Deno.readTextFile("a.ts"),
      dedent`
        import { assert } from "jsr:@std/assert@0.224.0";
        import { copy } from "https://deno.land/std@0.222.0/bytes/copy.ts";
      `,
    );
    await rewrite(refs[1], "0.224.0");
    assertEquals(
      await Deno.readTextFile("a.ts"),
      dedent`
        import { assert } from "jsr:@std/assert@0.224.0";
        import { copy } from "https://deno.land/std@0.224.0/bytes/copy.ts";
      `,
    );
  });

  it("should rewrite dependencies in an import map", async () => {
    await Deno.writeTextFile(
      "a.json",
      dedent`
        {
          "imports": {
            "@std/assert": "jsr:@std/assert@^0.222.0",
            "@std/testing/bdd": "jsr:@std/testing@^0.222.0/bdd"
          }
        }
      ` + "\n",
    );
    const refs = await collect("a.json");
    await rewrite(refs[0], "0.224.0");
    assertEquals(
      await Deno.readTextFile("a.json"),
      dedent`
        {
          "imports": {
            "@std/assert": "jsr:@std/assert@0.224.0",
            "@std/testing/bdd": "jsr:@std/testing@^0.222.0/bdd"
          }
        }
      ` + "\n",
    );
    await rewrite(refs[1], "0.224.0");
    assertEquals(
      await Deno.readTextFile("a.json"),
      dedent`
        {
          "imports": {
            "@std/assert": "jsr:@std/assert@0.224.0",
            "@std/testing/bdd": "jsr:@std/testing@0.224.0/bdd"
          }
        }
      ` + "\n",
    );
  });
});

describe("commit", () => {
  let git: cmd.Stub<"git">;

  beforeEach(() => {
    git = cmd.stub("git");
    all(cmd, fs).mock();
  });

  afterEach(() => {
    all(cmd, fs).dispose();
  });

  it("should create a command to commit a dependency update", async () => {
    await Deno.writeTextFile(
      "a.ts",
      `import { assert } from "jsr:@std/assert@0.222.0";`,
    );
    await Deno.writeTextFile(
      "a.json",
      dedent`
        {
          "imports": {
            "@std/testing/bdd": "jsr:@std/testing@^0.222.0/bdd"
          }
        }
      `,
    );
    const refs = [
      ...await collect("a.ts"),
      ...await collect("a.json"),
    ];
    commit(refs, "chore: bump @std/assert to 0.224.0");

    assertSpyCallArg(git, 0, 1, {
      args: [
        "commit",
        "-m",
        "chore: bump @std/assert to 0.224.0",
        "a.ts",
        "a.json",
      ],
    });
  });
});
