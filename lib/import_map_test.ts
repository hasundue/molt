import { assertEquals, assertExists } from "./std/assert.ts";
import { toFileUrl } from "./std/path.ts";
import { beforeAll, describe, it } from "./std/testing.ts";
import { type ImportMap, readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("empty deno.json", async () => {
    const f = await Deno.makeTempFile();
    // use this cool stuff once it lands in deno
    // using cleanup = new DisposableStack();
    // cleanup.defer(async () => {
    //   await Deno.remove(f);
    // });
    const importMap = await readFromJson(toFileUrl(f));
    assertEquals(importMap, undefined);
    await Deno.remove(f);
  });

  it("test/data/import_map/deno.json", async () => {
    const url = new URL("../test/data/import_map/deno.json", import.meta.url);
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.url, url);
  });

  it("test/data/import_map_referred/import_map.json", async () => {
    const url = new URL(
      "../test/data/import_map_referred/import_map.json",
      import.meta.url,
    );
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.url, url);
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
        url: new URL("https://deno.land/std@0.200.0/version.ts"),
        key: "std/",
        value: "https://deno.land/std@0.200.0/",
      },
    );
    assertEquals(
      importMap.resolve("deno_graph", referrer),
      {
        url: new URL("https://deno.land/x/deno_graph@0.50.0/mod.ts"),
        key: "deno_graph",
        value: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    );
    assertEquals(
      importMap.resolve("node-emoji", referrer),
      {
        url: new URL("npm:node-emoji@1.0.0"),
        key: "node-emoji",
        value: "npm:node-emoji@1.0.0",
      },
    );
    assertEquals(
      importMap.resolve("/lib.ts", referrer),
      {
        url: new URL("../test/data/import_map/lib.ts", import.meta.url),
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
        url: new URL("https://deno.land/x/dax@0.17.0/mod.ts"),
        key: "dax",
        value: "https://deno.land/x/dax@0.17.0/mod.ts",
      },
    );
  });
});

describe("resolveInner()", () => {
  let importMap: ImportMap;

  beforeAll(async () => {
    const maybe = await readFromJson(
      new URL("../test/data/import_map/deno.json", import.meta.url),
    );
    assertExists(maybe);
    importMap = maybe;
  });

  it("resolve an absolute path", () => {
    assertEquals(
      importMap.resolveInner(
        "/lib.ts",
        new URL("../test/data/import_map/mod.ts", import.meta.url),
      ),
      new URL("../test/data/import_map/lib.ts", import.meta.url).href,
    );
  });
});
