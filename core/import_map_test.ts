import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { fromFileUrl, toFileUrl } from "@std/path";
import { beforeAll, describe, it } from "@std/testing/bdd";
import { type ImportMap, readFromJson } from "./import_map.ts";

describe("readFromJson", () => {
  it("should throw for an empty deno.json", async () => {
    const f = await Deno.makeTempFile();
    // use this cool stuff once it lands in deno
    // using cleanup = new DisposableStack();
    // cleanup.defer(async () => {
    //   await Deno.remove(f);
    // });
    assertRejects(() => readFromJson(toFileUrl(f)));
    await Deno.remove(f);
  });

  it("should parse deno.jsonc", async () => {
    const url = new URL(
      "../test/fixtures/deno.jsonc",
      import.meta.url,
    );
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.path, fromFileUrl(url));
  });

  it("should parse a referred import map", async () => {
    const url = new URL(
      "../test/fixtures/import_map/deno.json",
      import.meta.url,
    );
    const importMap = await readFromJson(url);
    assertExists(importMap);
    assertEquals(importMap.path, fromFileUrl(new URL("import_map.json", url)));
  });
});

describe("resolve", () => {
  const referrer = new URL("../test/fixtures/mod.ts", import.meta.url);
  let map: ImportMap;

  beforeAll(async () => {
    map = await readFromJson(
      new URL("../test/fixtures/deno.jsonc", import.meta.url),
    );
  });

  it("should resolve a jsr specifier", () => {
    assertEquals(
      map.resolve("@std/assert", referrer),
      {
        resolved: "jsr:@std/assert@0.222.0",
        key: "@std/assert",
        value: "jsr:@std/assert@0.222.0",
      },
    );
  });

  it("should resolve a jsr specifier with a caret", () => {
    assertEquals(
      map.resolve("@std/testing", referrer),
      {
        resolved: "jsr:@std/testing@^0.222.0",
        key: "@std/testing",
        value: "jsr:@std/testing@^0.222.0",
      },
    );
  });

  it("should resolve a jsr specifier with an entrypoint", () => {
    assertEquals(
      map.resolve("@std/assert/assert-equals", referrer),
      {
        resolved: "jsr:/@std/assert@0.222.0/assert-equals",
        key: "@std/assert",
        value: "jsr:@std/assert@0.222.0",
      },
    );
  });

  it("should resolve a npm specifier", () => {
    assertEquals(
      map.resolve("@octokit/core", referrer),
      {
        resolved: "npm:@octokit/core@6.1.0",
        key: "@octokit/core",
        value: "npm:@octokit/core@6.1.0",
      },
    );
  });

  it("should resolve an url specifier", () => {
    assertEquals(
      map.resolve("x/deno_graph", referrer),
      {
        resolved: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        key: "x/deno_graph",
        value: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    );
  });

  it("should resolve an url prefix specifier", () => {
    assertEquals(
      map.resolve("std/assert/mod.ts", referrer),
      {
        resolved: "https://deno.land/std@0.222.0/assert/mod.ts",
        key: "std/",
        value: "https://deno.land/std@0.222.0/",
      },
    );
  });

  it("should resolve a local mapping", () => {
    assertEquals(
      map.resolve("lib/path.ts", referrer),
      {
        resolved: new URL("../test/fixtures/lib/path.ts", import.meta.url).href,
        key: undefined,
        value: undefined,
      },
    );
  });

  it("should not resolve a complete url specifier", () => {
    assertEquals(
      map.resolve("https://deno.land/std@0.222.0/assert/mod.ts", referrer),
      undefined,
    );
  });

  it("resolve specifiers in a referred import map", async () => {
    const map = await readFromJson(
      new URL(
        "../test/fixtures/import_map/deno.json",
        import.meta.url,
      ),
    );
    assertExists(map);
    const referrer = new URL(
      "../test/fixtures/import_map/mod.ts",
      import.meta.url,
    );
    assertEquals(
      map.resolve("dax", referrer),
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
    new URL("../test/fixtures/deno.jsonc", import.meta.url),
  );
  const referrer = new URL("../test/fixtures/mod.ts", import.meta.url);
  assertEquals(
    resolveInner("lib/path.ts", referrer),
    new URL("../test/fixtures/lib/path.ts", import.meta.url).href,
  );
});
