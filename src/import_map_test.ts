import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { Uri } from "./types.ts";
import { toFileUri, ensurePath } from "./utils.ts";
import { isImportMap, readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("src/fixtures/_deno.json", async () => {
    const importMap = await readFromJson(ensurePath("src/fixtures/_deno.json"));
    assertExists(importMap);
    const referrer = toFileUri(ensurePath("src/fixtures/mod.ts"));
    assertEquals(
      importMap.tryResolve("std/version.ts", referrer),
      {
        key: "std/",
        specifier: "https://deno.land/std@0.200.0/version.ts" as Uri,
      }
    );
    assertEquals(
      importMap.tryResolve("deno_graph", referrer),
      {
        key: "deno_graph",
        specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts" as Uri,
      }
    );
    assertEquals(
      importMap.tryResolve("node-emoji", referrer),
      {
        key: "node-emoji",
        specifier: "npm:node-emoji@1.0.0" as Uri,
      }
    );
    assertEquals(
      importMap.tryResolve("/lib.ts", referrer),
      {
        key: undefined,
        specifier: toFileUri(ensurePath("src/fixtures/lib.ts")),
      }
    );
  });
});

describe("isImportMap()", () => {
  it("src/fixtures/_deno.json", async () => {
    assertEquals(
      await isImportMap(ensurePath("src/fixtures/_deno.json")),
      true,
    );
  });
  it("src/fixtures/mod.ts", async () => {
    assertEquals(
      await isImportMap(ensurePath("src/fixtures/mod.ts")),
      false,
    );
  });
});
