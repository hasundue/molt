import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { CreateGraphOptions } from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import {
  createDependencyUpdate,
  createResolve,
  parseDependencyProps,
} from "./core.ts";
import { toFileSpecifier } from "./utils.ts";

describe("createResolveImportMap()", () => {
  let resolve: NonNullable<CreateGraphOptions["resolve"]>;
  beforeAll(async () => {
    const _resolve = await createResolve({
      importMap: "src/fixtures/deno.json",
    });
    assertExists(_resolve);
    resolve = _resolve;
  });
  it("does not resolve a file specifier", () => {
    assertEquals(
      resolve("./lib.ts", toFileSpecifier("mod.ts")),
      toFileSpecifier("lib.ts"),
    );
  });
  it("resolve a relative path", () => {
    assertEquals(
      resolve("lodash", toFileSpecifier("mod.ts")),
      "https://esm.sh/lodash@4.17.21",
    );
  });
});

describe("parseDependencyProps()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/std@0.1.0/version.ts"),
      {
        specifier: "https://deno.land/std@0.1.0/version.ts",
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/std/version.ts"),
      undefined,
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/x/hono@v0.1.0"),
      {
        specifier: "https://deno.land/x/hono@v0.1.0",
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      parseDependencyProps("npm:node-emoji@1.0.0"),
      {
        specifier: "npm:node-emoji@1.0.0",
        name: "node-emoji",
        version: "1.0.0",
        path: "",
      },
    ));
});

describe("createDependencyUpdate()", () => {
  it("https://deno.land/std", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std@0.1.0/version.ts",
    });
    assertExists(update);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std/version.ts",
    });
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
    });
    assertExists(update);
  });
  it("npm:node-emoji", async () => {
    const update = await createDependencyUpdate({
      specifier: "npm:node-emoji@1.0.0",
    });
    assertExists(update);
  });
});

describe("createDependencyUpdate() - with import map", () => {
  it("https://deno.land/std", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std@0.1.0/version.ts",
    });
    assertExists(update);
  });
});
