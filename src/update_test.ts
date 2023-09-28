import { beforeAll, describe, it } from "../lib/std/testing.ts";
import {
  assertEquals,
  assertExists,
  assertNotEquals,
  assertObjectMatch,
} from "../lib/std/assert.ts";
import { URI } from "../lib/uri.ts";
import { _create, DependencyUpdate } from "./update.ts";
import { ImportMap } from "./import_map.ts";

describe("_create", () => {
  it("https://deno.land/std", async () => {
    const update = await _create({
      specifier: "https://deno.land/std@0.1.0/version.ts",
      code: {
        specifier: "https://deno.land/std@0.1.0/version.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, URI.from("src/fixtures/mod.ts"));
    assertExists(update);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await _create({
      specifier: "https://deno.land/std/version.ts",
      code: {
        specifier: "https://deno.land/std/version.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, URI.from("src/fixtures/mod.ts"));
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await _create({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
      code: {
        specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, URI.from("src/fixtures/mod.ts"));
    assertExists(update);
  });
  it("npm:node-emoji", async () => {
    const update = await _create({
      specifier: "npm:node-emoji@1.0.0",
      code: {
        specifier: "npm:node-emoji@1.0.0",
        // deno-lint-ignore no-explicit-any
      } as any,
    }, URI.from("src/fixtures/mod.ts"));
    assertExists(update);
  });
});

describe("_create - with import map", () => {
  let importMap: ImportMap;
  beforeAll(async () => {
    importMap = (await ImportMap.readFromJson("src/fixtures/_deno.json"))!;
  });
  it("std/version.ts", async () => {
    const update = await _create(
      {
        specifier: "std/version.ts",
        code: {
          specifier: "https://deno.land/std@0.200.0/version.ts",
          // deno-lint-ignore no-explicit-any
        } as any,
      },
      URI.from("src/fixtures/import_maps.ts"),
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
      specifier: "https://deno.land/std@0.200.0/version.ts",
      code: { specifier: "std/version.ts" },
      referrer: URI.from("src/fixtures/import_maps.ts"),
      map: {
        source: URI.from("src/fixtures/_deno.json"),
        from: "std/",
        to: "https://deno.land/std@0.200.0/",
      },
    });
  });
});

describe("collect", () => {
  it("src/fixtures/mod.ts", async () => {
    const updates = await DependencyUpdate.collect(
      "./src/fixtures/mod.ts",
    );
    assertEquals(updates.length, 4);
  });
  it("src/fixtures/import_maps.ts", async () => {
    const updates = await DependencyUpdate.collect(
      "./src/fixtures/import_maps.ts",
      {
        importMap: "src/fixtures/_deno.json",
      },
    );
    assertEquals(updates.length, 4);
  });
});

describe("applyToModule", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./src/fixtures/mod.ts",
    );
    content = Deno.readTextFileSync("./src/fixtures/mod.ts");
  });
  it("https://deno.land/x/deno_graph", () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/x/deno_graph")
    )!;
    const result = DependencyUpdate.applyToModule(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
  it("npm:node-emoji", () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = DependencyUpdate.applyToModule(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
});

describe("applyToImportMap", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await DependencyUpdate.collect(
      "./src/fixtures/import_maps.ts",
      { importMap: "src/fixtures/_deno.json" },
    );
    content = await Deno.readTextFile("src/fixtures/_deno.json");
  });
  it("deno_graph", () => {
    const update = updates.find((update) =>
      update.code.specifier === "deno_graph"
    )!;
    const result = DependencyUpdate.applyToImportMap(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
});
