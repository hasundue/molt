import { beforeAll, describe, it } from "./std/testing.ts";
import { assertEquals, assertExists } from "./std/assert.ts";
import { URI } from "./uri.ts";
import { ImportMap } from "./import_map.ts";

describe("readFromJson()", () => {
  it("empty deno.json", async () => {
    const f = await Deno.makeTempFile();
    // use this cool stuff once it lands in deno
    // using cleanup = new DisposableStack();
    // cleanup.defer(async () => {
    //   await Deno.remove(f);
    // });
    const importMap = await ImportMap.readFromJson(URI.from(f));
    assertEquals(importMap, undefined);
    await Deno.remove(f);
  });
  it("test/fixtures/import-map/deno.json", async () => {
    const importMap = await ImportMap.readFromJson(
      URI.from(
        new URL("../test/fixtures/import-map/deno.json", import.meta.url),
      ),
    );
    assertExists(importMap);
  });
  it("test/fixtures/import-map-referred/import_map.json", async () => {
    const importMap = await ImportMap.readFromJson(
      URI.from(
        new URL(
          "../test/fixtures/import-map-referred/deno.json",
          import.meta.url,
        ),
      ),
    );
    assertExists(importMap);
    assertEquals(
      importMap.specifier,
      URI.from("./test/fixtures/import-map-referred/import_map.json"),
    );
  });
});

describe("resolve()", () => {
  it("resolve specifiers in import maps", async () => {
    const importMap = await ImportMap.readFromJson(
      URI.from(
        new URL("../test/fixtures/import-map/deno.json", import.meta.url),
      ),
    );
    assertExists(importMap);
    const referrer = URI.from("./test/fixtures/import-map/mod.ts");
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
        specifier: URI.from("./test/fixtures/import-map/lib.ts"),
      },
    );
  });
  it("do not resolve an url", async () => {
    const importMap = await ImportMap.readFromJson(
      URI.from(
        new URL(
          "../test/fixtures/import-map-no-resolve/deno.json",
          import.meta.url,
        ),
      ),
    );
    assertExists(importMap);
    const referrer = URI.from("./test/fixtures/import-map-no-resolve/deps.ts");
    assertEquals(
      importMap.resolve(
        "https://deno.land/std@0.171.0/testing/asserts.ts",
        referrer,
      ),
      undefined,
    );
  });
  it("resolve specifiers in a referred import map", async () => {
    const importMap = await ImportMap.readFromJson(
      URI.from(
        new URL(
          "../test/fixtures/import-map-referred/deno.json",
          import.meta.url,
        ),
      ),
    );
    assertExists(importMap);
    const referrer = URI.from("test/fixtures/import-map-referred/mod.ts");
    assertEquals(
      importMap.resolve("dax", referrer),
      {
        specifier: "https://deno.land/x/dax@0.17.0/mod.ts",
        from: "dax",
        to: "https://deno.land/x/dax@0.17.0/mod.ts",
      },
    );
  });
});

describe("resolveSimple()", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    const maybe = await ImportMap.readFromJson(
      URI.from(
        new URL("../test/fixtures/import-map/deno.json", import.meta.url),
      ),
    );
    assertExists(maybe);
    importMap = maybe;
  });
  it("resolve an absolute path", () => {
    assertEquals(
      importMap.resolveSimple(
        "/lib.ts",
        URI.from("test/fixtures/import-map/mod.ts"),
      ),
      URI.from("test/fixtures/import-map/lib.ts"),
    );
  });
});
