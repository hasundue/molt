import {
  afterEach,
  assertSpyCalls,
  beforeEach,
  describe,
  it,
  SpyCall,
} from "./std/testing.ts";
import { assertEquals } from "./std/assert.ts";
import { EOL, formatEOL } from "./std/fs.ts";
import {
  assertFindSpyCallArg,
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { assertSnapshot } from "./testing.ts";
import { DependencyUpdate } from "./update.ts";
import { FileUpdate } from "./file.ts";
import { LatestSemVerStub } from "./testing.ts";
import { SemVerString } from "./semver.ts";

const LATEST = "123.456.789" as SemVerString;
LatestSemVerStub.create(LATEST);

function assertCollected(
  actual: FileUpdate[],
  expected: string[],
) {
  const names = actual.map(
    (f) => f.dependencies.map((d) => d.from.name),
  ).flat();
  assertEquals(names, expected);
}

describe("FileUpdate.collect()", () => {
  it("direct import", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./test/data/import.ts"),
    );
    assertCollected(results, ["deno.land/std"]);
  });

  it("relative import", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect("./test/data/relative_import/mod.ts"),
    );
    assertCollected(results, ["deno.land/std"]);
  });

  it("import map", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/data/import_map/mod.ts",
        { importMap: "./test/data/import_map/deno.json" },
      ),
    );
    assertCollected(results, [
      "deno.land/std",
      "deno.land/x/deno_graph",
      "node-emoji",
    ]);
  });

  it("import map with no resolve", async () => {
    const results = FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/data/import_map_no_resolve/mod.ts",
        { importMap: "./test/data/import_map_no_resolve/deno.json" },
      ),
    );
    assertCollected(results, ["deno.land/std"]);
  });
});

async function assertWriteTextFileSnapshot(
  t: Deno.TestContext,
  call: SpyCall,
) {
  await assertSnapshot(t, formatEOL(call.args[1], EOL.LF));
}

describe("FileUpdate.write()", () => {
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
    await FileUpdate.write(FileUpdate.collect(
      await DependencyUpdate.collect("./test/data/import.ts"),
    ));
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/data/import.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });

  it("relative import", async (t) => {
    await FileUpdate.write(FileUpdate.collect(
      await DependencyUpdate.collect("./test/data/relative_import/mod.ts"),
    ));
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/data/relative_import/assert.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });

  it("import map", async (t) => {
    await FileUpdate.write(FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/data/import_map/mod.ts",
        { importMap: "./test/data/import_map/deno.json" },
      ),
    ));
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/data/import_map/deno.json", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });

  it("import map with no resolve", async (t) => {
    await FileUpdate.write(FileUpdate.collect(
      await DependencyUpdate.collect(
        "./test/data/import_map_no_resolve/mod.ts",
        { importMap: "./test/data/import_map_no_resolve/deno.json" },
      ),
    ));
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/data/import_map_no_resolve/mod.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });

  it("unversioned specifiers", async (t) => {
    await FileUpdate.write(FileUpdate.collect(
      await DependencyUpdate.collect("./test/data/unversioned.ts"),
    ));
    const call = assertFindSpyCallArg(
      writeTextFileStub,
      0,
      new URL("../test/data/unversioned.ts", import.meta.url),
    );
    await assertWriteTextFileSnapshot(t, call);
    assertSpyCalls(writeTextFileStub, 1);
  });
});
