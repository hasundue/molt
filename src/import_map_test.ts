import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { URI } from "./uri.ts";
import { isImportMap, readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("src/fixtures/_deno.json", async () => {
    const importMap = await readFromJson("src/fixtures/_deno.json");
    assertExists(importMap);
    const referrer = URI.from("src/fixtures/mod.ts");
    assertEquals(
      importMap.tryResolve("std/version.ts", referrer),
      {
        source: "https://deno.land/std@0.200.0/version.ts",
        from: "std/",
        to: "https://deno.land/std@0.200.0/",
      },
    );
    assertEquals(
      importMap.tryResolve("deno_graph", referrer),
      {
        source: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        from: "deno_graph",
        to: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    );
    assertEquals(
      importMap.tryResolve("node-emoji", referrer),
      {
        source: "npm:node-emoji@1.0.0",
        from: "node-emoji",
        to: "npm:node-emoji@1.0.0",
      },
    );
    assertEquals(
      importMap.tryResolve("/lib.ts", referrer),
      {
        source: URI.from("src/fixtures/lib.ts"),
      },
    );
  });
});

describe("isImportMap()", () => {
  it("src/fixtures/_deno.json", async () => {
    assertEquals(
      await isImportMap("src/fixtures/_deno.json"),
      true,
    );
  });
  it("src/fixtures/mod.ts", async () => {
    assertEquals(
      await isImportMap("src/fixtures/mod.ts"),
      false,
    );
  });
});
