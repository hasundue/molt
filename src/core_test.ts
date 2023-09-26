import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { CreateGraphOptions } from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import type { DependencySpecifier, FilePath } from "./types.ts";
import {
  createDependencyUpdate,
  createResolve,
  parseDependencyProps,
} from "./core.ts";
import { toFileSpecifier } from "./utils.ts";
import { ImportMap, readFromJson } from "./import_map.ts";

describe("createResolve()", () => {
  let resolve: NonNullable<CreateGraphOptions["resolve"]>;
  beforeAll(async () => {
    const _resolve = await createResolve({
      importMap: "src/fixtures/_deno.json" as FilePath,
    });
    assertExists(_resolve);
    resolve = _resolve;
  });
  it("does not create a callback without import map", async () => {
    const resolve = await createResolve();
    assertEquals(resolve, undefined);
  });
  it("resolve an absolute path", () => {
    assertEquals(
      resolve("/lib.ts", toFileSpecifier("src/fixtures/mod.ts" as FilePath)),
      toFileSpecifier("src/fixtures/lib.ts" as FilePath),
    );
  });
});

describe("parseDependencyProps()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseDependencyProps(
        "https://deno.land/std@0.1.0/version.ts" as DependencySpecifier,
      ),
      {
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseDependencyProps(
        "https://deno.land/std/version.ts" as DependencySpecifier,
      ),
      undefined,
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      parseDependencyProps(
        "https://deno.land/x/hono@v0.1.0" as DependencySpecifier,
      ),
      {
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      parseDependencyProps("npm:node-emoji@1.0.0" as DependencySpecifier),
      {
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
      code: {
        specifier: "https://deno.land/std@0.1.0/version.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, toFileSpecifier("src/fixtures/mod.ts" as FilePath));
    assertExists(update);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std/version.ts",
      code: {
        specifier: "https://deno.land/std/version.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, toFileSpecifier("src/fixtures/mod.ts" as FilePath));
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
      code: {
        specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, toFileSpecifier("src/fixtures/mod.ts" as FilePath));
    assertExists(update);
  });
  it("npm:node-emoji", async () => {
    const update = await createDependencyUpdate({
      specifier: "npm:node-emoji@1.0.0",
      code: {
        specifier: "npm:node-emoji@1.0.0",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, toFileSpecifier("src/fixtures/mod.ts" as FilePath));
    assertExists(update);
  });
});

describe("createDependencyUpdate() - with import map", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    importMap = await readFromJson("src/fixtures/_deno.json" as FilePath);
  });
  it("std/version.ts", async () => {
    const update = await createDependencyUpdate(
      {
        specifier: "std/version.ts",
        code: {
          specifier: "https://deno.land/std@0.200.0/version.ts",
          // deno-lint-ignore no-explicit-any
        } as any,
      },
      toFileSpecifier("src/fixtures/import_maps.ts" as FilePath),
      { importMap },
    );
    assertExists(update);
    assertObjectMatch(update, {
      name: "deno.land/std",
      version: { from: "0.200.0", to: "0.202.0" },
      path: "/version.ts",
      specifier: "https://deno.land/std@0.200.0/version.ts",
      code: { specifier: "std/version.ts", span: undefined },
      referrer: "src/fixtures/import_maps.ts",
      importMap: "src/fixtures/_deno.json",
    });
  });
});
