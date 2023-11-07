import {
  afterEach,
  assertSnapshot,
  assertSpyCalls,
  beforeEach,
  describe,
  it,
  SpyCall,
} from "./std/testing.ts";
import { assertArrayIncludes, assertEquals } from "./std/assert.ts";
import { EOL, formatEOL } from "./std/fs.ts";
import {
  assertFindSpyCallArg,
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { LatestSemVerStub } from "./testing.ts";
import { SemVerString } from "./types.ts";

const LATEST = "123.456.789" as SemVerString;
LatestSemVerStub.create(LATEST);

describe("collect", () => {
  it("direct import", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/direct-import/mod.ts"),
    );
    assertEquals(results.length, 2);
  });

  it("import map", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map/mod.ts",
        { importMap: "./test/fixtures/import-map/deno.json" },
      ),
    );
    assertEquals(results.length, 2);
    const dependencies = results.flatMap((r) => r.dependencies);
    assertEquals(dependencies.length, 4);
    const names = dependencies.map((d) => d.from.name);
    assertArrayIncludes(names, [
      "deno.land/std",
      "deno.land/x/deno_graph",
      "node-emoji",
    ]);
  });

  it("import map with no resolve", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map-no-resolve/mod.ts",
        { importMap: "./test/fixtures/import-map-no-resolve/deno.json" },
      ),
    );
    assertEquals(results.length, 1);
    assertEquals(results[0].dependencies.length, 1);
    assertEquals(results[0].dependencies[0].from.name, "deno.land/std");
  });
});

describe("write", () => {
  let fs: FileSystemFake;
  let readTextFileStub: ReadTextFileStub;
  let writeTextFileStub: WriteTextFileStub;

  beforeEach(() => {
    fs = new FileSystemFake();
    readTextFileStub = ReadTextFileStub.create(fs, { readThrough: true });
    writeTextFileStub = WriteTextFileStub.create(fs);
  });
  afterEach(() => {
    readTextFileStub.restore();
    writeTextFileStub.restore();
  });

  it("direct import", async (t) => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/direct-import/mod.ts"),
    );
    await FileUpdate.write(results);
    const call_1 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/direct-import/mod.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_1);
    const call_2 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/direct-import/lib.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_2);
    assertSpyCalls(writeTextFileStub, 2);
  });

  it("import map", async (t) => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map/mod.ts",
        { importMap: "./test/fixtures/import-map/deno.json" },
      ),
    );
    await FileUpdate.write(results);
    const call_1 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map/deno.json", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_1);
    const call_2 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map/lib.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_2);
    assertSpyCalls(writeTextFileStub, 2);
  });

  it("import map with no resolve", async (t) => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/fixtures/import-map-no-resolve/mod.ts",
        { importMap: "./test/fixtures/import-map-no-resolve/deno.json" },
      ),
    );
    await FileUpdate.write(results);
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/import-map-no-resolve/mod.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });

  it("unversioned specifiers", async (t) => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./test/fixtures/unversioned/mod.ts"),
    );
    await FileUpdate.write(results);
    const call_1 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/unversioned/mod.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_1);
    const call_2 = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/fixtures/unversioned/lib.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call_2);
    assertSpyCalls(writeTextFileStub, 2);
  });
});

async function assertWriteTextFileSnapshot(
  t: Deno.TestContext,
  call: SpyCall,
) {
  await assertSnapshot(t, formatEOL(call.args[1], EOL.LF));
}
