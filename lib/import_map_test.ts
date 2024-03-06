import { assertEquals, assertExists, assertRejects } from "./std/assert.ts";
import { fromFileUrl, toFileUrl } from "./std/path.ts";
import { describe, it } from "./std/testing.ts";
import { readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("throws for an empty deno.json", async () => {
    const f = await Deno.makeTempFile();
    // use this cool stuff once it lands in deno
    // using cleanup = new DisposableStack();
    // cleanup.defer(async () => {
    //   await Deno.remove(f);
    // });
    assertRejects(() => readFromJson(toFileUrl(f)));
    await Deno.remove(f);
  });

  it("test/data/import_map/deno.json", async () => {
    const url = new URL("../test/data/import_map/deno.json", import.meta.url);
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.path, fromFileUrl(url));
  });

  it("test/data/import_map_referred/import_map.json", async () => {
    const url = new URL(
      "../test/data/import_map_referred/import_map.json",
      import.meta.url,
    );
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.path, fromFileUrl(url));
  });
});

describe("resolve()", () => {
  it("resolve specifiers in import maps", async () => {
    const importMap = await readFromJson(
      new URL("../test/data/import_map/deno.json", import.meta.url),
    );
    assertExists(importMap);
    const referrer = new URL("../test/data/import_map/mod.ts", import.meta.url);
    assertEquals(
      importMap.resolve("std/version.ts", referrer),
      {
        resolved: "https://deno.land/std@0.200.0/version.ts",
        key: "std/",
        value: "https://deno.land/std@0.200.0/",
      },
    );
    assertEquals(
      importMap.resolve("deno_graph", referrer),
      {
        resolved: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        key: "deno_graph",
        value: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    );
    assertEquals(
      importMap.resolve("node-emoji", referrer),
      {
        resolved: "npm:node-emoji@2.0.0",
        key: "node-emoji",
        value: "npm:node-emoji@2.0.0",
      },
    );
    assertEquals(
      importMap.resolve("/lib.ts", referrer),
      {
        resolved:
          new URL("../test/data/import_map/lib.ts", import.meta.url).href,
        key: undefined,
        value: undefined,
      },
    );
  });
  it("do not resolve an url", async () => {
    const importMap = await readFromJson(
      new URL(
        "../test/data/import_map_no_resolve/deno.json",
        import.meta.url,
      ),
    );
    assertExists(importMap);
    const referrer = new URL(
      "../test/data/import_map_no_resolve/deps.ts",
      import.meta.url,
    );
    assertEquals(
      importMap.resolve(
        "https://deno.land/std@0.171.0/testing/asserts.ts",
        referrer,
      ),
      undefined,
    );
  });
  it("resolve specifiers in a referred import map", async () => {
    const importMap = await readFromJson(
      new URL(
        "../test/data/import_map_referred/deno.json",
        import.meta.url,
      ),
    );
    assertExists(importMap);
    const referrer = new URL(
      "../test/data/import_map_referred/mod.ts",
      import.meta.url,
    );
    assertEquals(
      importMap.resolve("dax", referrer),
      {
        resolved: "https://deno.land/x/dax@0.17.0/mod.ts",
        key: "dax",
        value: "https://deno.land/x/dax@0.17.0/mod.ts",
      },
    );
  });
});

Deno.test("resolveInner", async () => {
  const { resolveInner } = await readFromJson(
    new URL("../test/data/import_map/deno.json", import.meta.url),
  );
  assertEquals(
    resolveInner(
      "/lib.ts",
      new URL("../test/data/import_map/mod.ts", import.meta.url),
    ),
    new URL("../test/data/import_map/lib.ts", import.meta.url).href,
  );
});
