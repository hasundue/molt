import {
  afterEach,
  assertSpyCalls,
  beforeEach,
  describe,
  it,
  type Stub,
} from "./std/testing.ts";
import { assertArrayIncludes, assertEquals } from "./std/assert.ts";
import {
  assertSomeSpyCallArg,
  createWriteTextFileStub,
  FileSystemFake,
} from "./testing.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";

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
  let fs: FileSystemFake;
  let writeTextFileStub: Stub;

  afterEach(() => {
    writeTextFileStub.restore();
  });

  beforeEach(() => {
    fs = new FileSystemFake();
    writeTextFileStub = createWriteTextFileStub(fs);
  });

  it("direct import", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/direct-import/mod.ts"),
    );
    await FileUpdate.writeAll(results);
    assertSomeSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/direct-import/mod.ts", import.meta.url),
    );
    assertSomeSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/direct-import/lib.ts", import.meta.url),
    );
    assertSpyCalls(writeTextFileStub, 2);
  });

  it("import map", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map/mod.ts",
        { importMap: "./test/fixtures/import-map/deno.json" },
      ),
    );
    await FileUpdate.writeAll(results);
    assertSomeSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map/deno.json", import.meta.url),
    );
    assertSomeSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map/lib.ts", import.meta.url),
    );
    assertSpyCalls(writeTextFileStub, 2);
  });

  it("import map with no resolve", async () => {
    const results = await FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map-no-resolve/mod.ts",
        { importMap: "./test/fixtures/import-map-no-resolve/deno.json" },
      ),
    );
    await FileUpdate.writeAll(results);
    assertSomeSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map-no-resolve/mod.ts", import.meta.url),
    );
    assertSpyCalls(writeTextFileStub, 1);
  });
});
