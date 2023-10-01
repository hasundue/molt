import {
  afterAll,
  beforeAll,
  describe,
  it,
  type Stub,
  stub,
} from "../lib/std/testing.ts";
import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
} from "../lib/std/assert.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { URI } from "../lib/uri.ts";

describe("collect", () => {
  it("direct import", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect([{
        entrypoint: "./tests/direct-import/mod.ts",
      }]),
    );
    assertEquals(results.length, 2);
  });

  it("import map", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        [{
          entrypoint: "./tests/import-map/mod.ts",
          options: { importMap: "./tests/import-map/import_map.json" },
        }],
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
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        [{
          entrypoint: "./tests/import-map-no-resolve/mod.ts",
          options: {
            importMap: "./tests/import-map-no-resolve/import_map.json",
          },
        }],
      ),
    );
    assertEquals(results.length, 1);
    assertEquals(results[0].dependencies.length, 1);
    assertEquals(results[0].dependencies[0].name, "deno.land/std");
  });
});

describe("writeAll", () => {
  let output: Map<string, string>;
  let writeTextFileSyncStub: Stub;

  beforeAll(() => {
    output = new Map<string, string>();
    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync", // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
  });

  it("direct import", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        [{
          entrypoint: "./tests/direct-import/mod.ts",
        }],
      ),
    );
    FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("tests/direct-import/mod.ts")));
    assertExists(output.get(URI.from("tests/direct-import/lib.ts")));
  });

  it("import map", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        [{
          entrypoint: "./tests/import-map/mod.ts",
          options: {
            importMap: "./tests/import-map/import_map.json",
          },
        }],
      ),
    );
    FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("tests/import-map/import_map.json")));
  });

  it("import map with no resolve", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        [{
          entrypoint: "./tests/import-map-no-resolve/mod.ts",
          options: {
            importMap: "./tests/import-map-no-resolve/import_map.json",
          },
        }],
      ),
    );
    FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("tests/import-map-no-resolve/mod.ts")));
  });
});
