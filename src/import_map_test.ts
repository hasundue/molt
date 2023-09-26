import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import type { FilePath } from "./types.ts";
import { toFileSpecifier } from "./utils.ts";
import { isImportMap, readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("src/fixtures/_deno.json", async () => {
    const importMap = await readFromJson("src/fixtures/_deno.json" as FilePath);
    assertExists(importMap);
    assertEquals(
      importMap.tryResolve("node-emoji", toFileSpecifier("mod.ts" as FilePath)),
      {
        key: "node-emoji",
        specifier: "npm:node-emoji@1.0.0",
      }
    );
  });
});

describe("isImportMap()", () => {
  it("src/fixtures/_deno.json", async () => {
    assertEquals(
      await isImportMap("src/fixtures/_deno.json" as FilePath),
      true,
    );
  });
  it("src/fixtures/mod.ts", async () => {
    assertEquals(
      await isImportMap("src/fixtures/mod.ts" as FilePath),
      false,
    );
  });
});
