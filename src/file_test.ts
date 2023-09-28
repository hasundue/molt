import {
  afterAll,
  beforeAll,
  describe,
  it,
  type Stub,
  stub,
} from "../lib/std/testing.ts";
import {
  assertEquals,
  assertExists,
  assertNotEquals,
} from "../lib/std/assert.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { URI } from "../lib/uri.ts";

describe("collect", () => {
  it("src/fixtures/mod.ts", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./src/fixtures/mod.ts"),
    );
    assertEquals(results.length, 2);
  });
  it("src/fixtures/import_maps.ts", async () => {
    const original = Deno.readTextFileSync("./src/fixtures/_deno.json");
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./src/fixtures/import_maps.ts",
        { importMap: "src/fixtures/_deno.json" },
      ),
    );
    assertEquals(results.length, 2);
    assertNotEquals(results[0].content, original);
    assertNotEquals(results[1].content, original);
  });
});

describe("writeAll", () => {
  let output: Map<string, string>;
  let writeTextFileSyncStub: Stub;
  let results: FileUpdate[];

  beforeAll(async () => {
    output = new Map<string, string>();
    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync", // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );
    results = FileUpdate.collect(
      await DependencyUpdate.collect("./src/fixtures/mod.ts"),
    );
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
  });

  it("src/fixtures/mod.ts", () => {
    FileUpdate.writeAll(results);
    assertExists(output.get(URI.from("src/fixtures/mod.ts")));
    assertExists(output.get(URI.from("src/fixtures/lib.ts")));
  });
});
