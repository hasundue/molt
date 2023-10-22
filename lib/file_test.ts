import {
  afterAll,
  beforeAll,
  describe,
  it,
  type Stub,
  stub,
} from "./std/testing.ts";
import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "./std/assert.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { URI } from "./uri.ts";

describe("collect", () => {
  it("direct import", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/direct-import/mod.ts"),
    );
    assertEquals(results.length, 2);
  });

  it("import map", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map/mod.ts",
        { importMap: "./test/fixtures/import-map/deno.json" },
      ),
    );
    assertEquals(results.length, 2);
    const dependencies = results.flatMap((r) => r.dependencies);
    assertEquals(dependencies.length, 4);
    const names = dependencies.map((d) => d.name);
    assertArrayIncludes(names, [
      "deno.land/std",
      "deno.land/x/deno_graph",
      "node-emoji",
    ]);
  });

  it("import map with no resolve", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map-no-resolve/mod.ts",
        { importMap: "./test/fixtures/import-map-no-resolve/deno.json" },
      ),
    );
    assertEquals(results.length, 1);
    assertEquals(results[0].dependencies.length, 1);
    assertEquals(results[0].dependencies[0].name, "deno.land/std");
  });
});

describe("writeAll", () => {
  let output: Map<string, string>;
  let writeTextFileStub: Stub;

  beforeAll(() => {
    output = new Map<string, string>();
    writeTextFileStub = stub(
      Deno,
      "writeTextFile",
      // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );
  });

  afterAll(() => {
    writeTextFileStub.restore();
  });

  it("direct import", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/direct-import/mod.ts"),
    );
    await FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("test/fixtures/direct-import/mod.ts")));
    assertExists(output.get(URI.from("test/fixtures/direct-import/lib.ts")));
  });

  it("import map", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map/mod.ts",
        { importMap: "./test/fixtures/import-map/deno.json" },
      ),
    );
    await FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("test/fixtures/import-map/deno.json")));
  });

  it("import map with no resolve", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map-no-resolve/mod.ts",
        { importMap: "./test/fixtures/import-map-no-resolve/deno.json" },
      ),
    );
    await FileUpdate.writeAll(results);
    assertExists(
      output.get(URI.from("test/fixtures/import-map-no-resolve/mod.ts")),
    );
  });
});
