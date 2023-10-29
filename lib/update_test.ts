// deno-lint-ignore-file no-explicit-any
import { assertSnapshot, beforeAll, describe, it } from "./std/testing.ts";
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
  assertThrows,
} from "./std/assert.ts";
import { URI } from "./uri.ts";
import { _create, createVersionProp, DependencyUpdate } from "./update.ts";
import { ImportMap } from "./import_map.ts";

describe("_create", () => {
  it("https://deno.land/std", async (t) => {
    const update = await _create({
      specifier: "https://deno.land/std@0.1.0/version.ts",
      code: {
        specifier: "https://deno.land/std@0.1.0/version.ts",
      } as any,
    }, URI.from("test/fixtures/direct-import/mod.ts"));
    assertExists(update);
    await assertSnapshot(t, update);
  });
  it("https://deno.land/std - unversioned", async (t) => {
    const update = await _create({
      specifier: "https://deno.land/std/version.ts",
      code: {
        specifier: "https://deno.land/std/version.ts",
      } as any,
    }, URI.from("test/fixtures/direct-import/mod.ts"));
    assertExists(update);
    await assertSnapshot(t, update);
  });
  it("https://deno.land/x/deno_graph", async (t) => {
    const update = await _create({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
      code: {
        specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
      } as any,
    }, URI.from("test/fixtures/direct-import/mod.ts"));
    assertExists(update);
    await assertSnapshot(t, update);
  });
  it("npm:node-emoji", async (t) => {
    const update = await _create({
      specifier: "npm:node-emoji@1.0.0",
      code: {
        specifier: "npm:node-emoji@1.0.0",
      } as any,
    }, URI.from("test/fixtures/direct-import/mod.ts"));
    assertExists(update);
    await assertSnapshot(t, update);
  });
  it("npm:node-emoji - unversioned", async (t) => {
    const update = await _create({
      specifier: "npm:node-emoji",
      code: {
        specifier: "npm:node-emoji",
      } as any,
    }, URI.from("test/fixtures/direct-import/mod.ts"));
    assertExists(update);
    await assertSnapshot(t, update);
  });
});

describe("_create - with import map", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    importMap = (await ImportMap.readFromJson(
      URI.from("../test/fixtures/import-map/deno.json", import.meta.url),
    ))!;
  });
  it("std/version.ts", async () => {
    const update = await _create(
      {
        specifier: "std/version.ts",
        code: {
          specifier: "https://deno.land/std@0.200.0/version.ts",
        } as any,
      },
      URI.from("test/fixtures/import-map/mod.ts"),
      { importMap },
    );
    assertExists(update);
    assertObjectMatch(update, {
      name: "deno.land/std",
      version: {
        from: "0.200.0",
        // to: "0.203.0",
      },
      path: "/version.ts",
      specifier: {
        from: "https://deno.land/std@0.200.0/version.ts",
        // to: "https://deno.land/std@0.203.0/version.ts",
      },
      code: { specifier: "std/version.ts" },
      referrer: URI.from("test/fixtures/import-map/mod.ts"),
      map: {
        source: URI.from("test/fixtures/import-map/deno.json"),
        from: "std/",
        to: "https://deno.land/std@0.200.0/",
      },
    });
  });
});

describe("collect", () => {
  it("direct import", async (t) => {
    const updates = await DependencyUpdate.collect(
      "./test/fixtures/direct-import/mod.ts",
    );
    assertEquals(updates.length, 4);
    await assertSnapshot(t, updates);
  });
  it("import map", async (t) => {
    const updates = await DependencyUpdate.collect(
      "./test/fixtures/import-map/mod.ts",
      {
        importMap: "./test/fixtures/import-map/deno.json",
      },
    );
    assertEquals(updates.length, 4);
    await assertSnapshot(t, updates);
  });
});

describe("applyToModule", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./test/fixtures/direct-import/mod.ts",
    );
    content = await Deno.readTextFile("./test/fixtures/direct-import/mod.ts");
  });
  it("https://deno.land/x/deno_graph", async (t) => {
    const update = updates.find((update) =>
      update.specifier.from.includes("deno.land/x/deno_graph")
    )!;
    const result = DependencyUpdate.applyToModule(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
    await assertSnapshot(t, result);
  });
  it("npm:node-emoji", async (t) => {
    const update = updates.find((update) =>
      update.specifier.from.includes("node-emoji")
    )!;
    const result = DependencyUpdate.applyToModule(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
    await assertSnapshot(t, result);
  });
});

describe("applyToImportMap", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./test/fixtures/import-map/mod.ts",
      { importMap: "test/fixtures/import-map/deno.json" },
    );
    content = await Deno.readTextFile("test/fixtures/import-map/deno.json");
  });
  it("deno_graph", async (t) => {
    const update = updates.find((update) =>
      update.code?.specifier === "deno_graph"
    )!;
    const result = DependencyUpdate.applyToImportMap(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
    await assertSnapshot(t, result);
  });
});

describe("createVersionProps()", () => {
  it("single version", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
      ] as any),
      {
        from: "0.0.1",
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with different names", () => {
    assertEquals(
      createVersionProp([{
        name: "deno_graph",
        version: { from: "0.0.1", to: "0.1.0" },
      }, {
        name: "node-emoji",
        version: { from: "0.0.1", to: "0.1.0" },
      }] as any),
      undefined,
    );
  });
  it("multiple versions with different `from`s and a common `to`", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.2", to: "0.1.0" },
        },
      ] as any),
      {
        from: undefined,
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with a common `from` and `to`", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
      ] as any),
      {
        from: "0.0.1",
        to: "0.2.0",
      },
    );
  });
  it("multiple versions with a common `from` and different `to`s", () => {
    assertThrows(() =>
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
      ] as any)
    );
  });
});
