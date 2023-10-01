import { beforeAll, describe, it } from "../lib/std/testing.ts";
import { assertEquals, assertExists } from "../lib/std/assert.ts";
import { URI } from "../lib/uri.ts";
import { ImportMap } from "./import_map.ts";

describe("readFromJson()", () => {
  it("tests/import-map/import_map.json", async () => {
    const importMap = await ImportMap.readFromJson(
      "./tests/import-map/import_map.json",
    );
    assertExists(importMap);
  });
});

describe("resolve()", () => {
  it("resolve specifiers in import maps", async () => {
    const importMap = await ImportMap.readFromJson(
      "tests/import-map/import_map.json",
    );
    assertExists(importMap);
    const referrer = URI.from("tests/import-map/mod.ts");
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
        specifier: URI.from("tests/import-map/lib.ts"),
      },
    );
  });
  it("do not resolve an url", async () => {
    const importMap = await ImportMap.readFromJson(
      "tests/import-map-no-resolve/import_map.json",
    );
    assertExists(importMap);
    const referrer = URI.from("tests/import-map-no-resolve/deps.ts");
    assertEquals(
      importMap.resolve(
        "https://deno.land/std@0.171.0/testing/asserts.ts",
        referrer,
      ),
      undefined,
    );
  });
});

describe("resolveSimple()", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    const maybe = await ImportMap.readFromJson(
      "tests/import-map/import_map.json",
    );
    assertExists(maybe);
    importMap = maybe;
  });
  it("resolve an absolute path", () => {
    assertEquals(
      importMap.resolveSimple("/lib.ts", URI.from("tests/import-map/mod.ts")),
      URI.from("tests/import-map/lib.ts"),
    );
  });
});
