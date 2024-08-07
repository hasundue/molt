import { all, cmd, fs } from "@chiezo/amber";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assertSpyCallArg } from "@std/testing/mock";
import { collect } from "./mod.ts";
import { assertEquals, assertExists } from "@std/assert";
import dedent from "dedent";

const MOD_TS = dedent`
import "jsr:@luca/flag@1.0.0";
`;

const MOD_TS_DUPLICATED = dedent`
import "jsr:@luca/flag@1.0.0";
import "jsr:@luca/flag@1.0.1";
`;

const DENO_JSON = dedent`
{
  "imports": {
    "@luca/flag": "jsr:@luca/flag@^1.0.0",
  }
}
`;

const DENO_LOCK = dedent`
{
  "version": "3",
  "packages": {
    "specifiers": {
      "jsr:@luca/flag@^1.0.0": "jsr:@luca/flag@1.0.0"
    },
    "jsr": {
      "@luca/flag@1.0.0": {
        "integrity": "1c76cf54839a86d0929a619c61bd65bb73d7d8a4e31788e48c720dbc46c5d546"
      }
    }
  },
  "remote": {},
  "workspace": {
    "dependencies": [
      "jsr:@luca/flag@^1.0.0"
    ]
  }
}
`;

describe("core", () => {
  let git: cmd.Stub<"git">;

  beforeEach(async () => {
    git = cmd.stub("git");
    all(cmd, fs).mock();
    await Promise.all([
      Deno.writeTextFile("mod.ts", MOD_TS),
      Deno.writeTextFile("deno.json", DENO_JSON),
      Deno.writeTextFile("deno.lock", DENO_LOCK),
    ]);
  });

  afterEach(() => all(cmd, fs).dispose());

  it("should update dependencies in a module", async () => {
    const deps = await collect({ source: ["mod.ts"] });
    assertEquals(deps.length, 1);
    const [dep] = deps;
    assertEquals(dep.refs.length, 1);
    assertEquals(dep.refs[0], "mod.ts");
    const update = await dep.check();
    assertExists(update);
    assertEquals(update.dep.name, "@luca/flag");
    await update.write();
    assertEquals(await Deno.readTextFile("deno.json"), DENO_JSON);
    assertEquals(await Deno.readTextFile("deno.lock"), DENO_LOCK);
    assertEquals(
      await Deno.readTextFile("mod.ts"),
      `import "jsr:@luca/flag@1.0.1";`,
    );
    await update.commit();
    assertSpyCallArg(git, 0, 1, {
      args: [
        "commit",
        "-m",
        "bump @luca/flag from 1.0.0 to 1.0.1",
        "mod.ts",
      ],
      lock: undefined,
    });
  });

  it("should handle a duplicated dependency in a module", async () => {
    await Deno.writeTextFile("mod.ts", MOD_TS_DUPLICATED);
    const deps = await collect({ source: ["mod.ts"] });
    assertEquals(deps.length, 1);
    const [dep] = deps;
    assertEquals(dep.refs.length, 1);
    assertEquals(dep.refs[0], "mod.ts");
    const update = await dep.check();
    assertExists(update);
    assertEquals(update.dep.name, "@luca/flag");
    assertEquals(update.constraint?.from, "1.0.0");
    await update.write();
    assertEquals(
      await Deno.readTextFile("mod.ts"),
      dedent`
        import "jsr:@luca/flag@1.0.1";
        import "jsr:@luca/flag@1.0.1";
    `,
    );
    assertEquals(await Deno.readTextFile("deno.json"), DENO_JSON);
    assertEquals(await Deno.readTextFile("deno.lock"), DENO_LOCK);
    await update.commit();
    assertSpyCallArg(git, 0, 1, {
      args: [
        "commit",
        "-m",
        "bump @luca/flag from 1.0.0 to 1.0.1",
        "mod.ts",
      ],
      lock: undefined,
    });
  });

  it("should update dependencies in a configuration", async () => {
    const deps = await collect({ config: "deno.json", lock: "deno.lock" });
    assertEquals(deps.length, 1);
    const [dep] = deps;
    assertEquals(dep.refs.length, 1);
    assertEquals(dep.refs[0], "deno.json");
    const update = await dep.check();
    assertExists(update);
    assertEquals(update.dep.name, "@luca/flag");
    await update.write();
    assertEquals(await Deno.readTextFile("mod.ts"), MOD_TS);
    assertEquals(await Deno.readTextFile("deno.json"), DENO_JSON);
    assertEquals(
      await Deno.readTextFile("deno.lock"),
      dedent`
        {
          "version": "3",
          "packages": {
            "specifiers": {
              "jsr:@luca/flag@^1.0.0": "jsr:@luca/flag@1.0.1"
            },
            "jsr": {
              "@luca/flag@1.0.1": {
                "integrity": "dce7eb4159b1bdb1606fe05c2e5388dcff5ae3b0b84184b934bc623143742408"
              }
            }
          },
          "remote": {},
          "workspace": {
            "dependencies": [
              "jsr:@luca/flag@^1.0.0"
            ]
          }
        }
      ` + "\n",
    );
    await update.commit();
    assertSpyCallArg(git, 0, 1, {
      args: [
        "commit",
        "-m",
        "bump @luca/flag from 1.0.0 to 1.0.1",
        "deno.json",
        "deno.lock",
      ],
      lock: "deno.lock",
    });
  });

  it("should handle an non-locked dependency", async () => {
    await Deno.writeTextFile(
      "deno.json",
      dedent`
        {
          "imports": {
            "@conventional-commits/parser": "npm:@conventional-commits/parser@^0.3.0",
            "@luca/flag": "jsr:@luca/flag@^1.0.0"
          }
        }
      `,
    );
    const deps = await collect({ config: "deno.json", lock: "deno.lock" });
    assertEquals(deps.length, 2);
    const [dep] = deps;
    const update = await dep.check();
    assertExists(update);
    assertEquals(update.dep.name, "@conventional-commits/parser");
    await update.write();
    assertEquals(await Deno.readTextFile("mod.ts"), MOD_TS);
    assertEquals(
      await Deno.readTextFile("deno.json"),
      dedent`
        {
          "imports": {
            "@conventional-commits/parser": "npm:@conventional-commits/parser@^0.4.0",
            "@luca/flag": "jsr:@luca/flag@^1.0.0"
          }
        }
      `,
    );
    assertEquals(await Deno.readTextFile("deno.lock"), DENO_LOCK);
    await update.commit();
    assertSpyCallArg(git, 0, 1, {
      args: [
        "commit",
        "-m",
        "bump @conventional-commits/parser to ^0.4.0",
        "deno.json",
      ],
      lock: undefined,
    });
  });
});
