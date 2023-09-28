import { beforeAll, describe, it } from "../lib/std/testing.ts";
import { assertEquals, assertExists } from "../lib/std/assert.ts";
import { URI } from "../lib/uri.ts";
import { ImportMap } from "./import_map.ts";

describe("readFromJson()", () => {
  it("src/fixtures/_deno.json", async () => {
    const importMap = await ImportMap.readFromJson("src/fixtures/_deno.json");
    assertExists(importMap);
  });
});

describe("resolve()", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    const maybe = await ImportMap.readFromJson("src/fixtures/_deno.json");
    assertExists(maybe);
    importMap = maybe;
  });
  it("resolve an absolute path", () => {
    const referrer = URI.from("src/fixtures/mod.ts");
    assertEquals(
      importMap.resolve("std/version.ts", referrer),
      {
        specifier: "https://deno.land/std@0.200.0/version.ts",
        from: "std/",
        to: "https://deno.land/std@0.200.0/",
      },
    );
    assertEquals(
      importMap.resolve("deno_graph", referrer),
      {
        specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        from: "deno_graph",
        to: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    );
    assertEquals(
      importMap.resolve("node-emoji", referrer),
      {
        specifier: "npm:node-emoji@1.0.0",
        from: "node-emoji",
        to: "npm:node-emoji@1.0.0",
      },
    );
    assertEquals(
      importMap.resolve("/lib.ts", referrer),
      {
        specifier: URI.from("src/fixtures/lib.ts"),
      },
    );
  });
});

describe("resolveSimple()", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    const maybe = await ImportMap.readFromJson("src/fixtures/_deno.json");
    assertExists(maybe);
    importMap = maybe;
  });
  it("resolve an absolute path", () => {
    assertEquals(
      importMap.resolveSimple("/lib.ts", URI.from("src/fixtures/mod.ts")),
      URI.from("src/fixtures/lib.ts"),
    );
  });
});
