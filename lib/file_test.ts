import { basename, dirname } from "./std/path.ts";
import { formatEOL, LF } from "./std/fs.ts";
import {
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { assert, assertInstanceOf } from "./std/assert.ts";
import { assertSnapshot } from "./testing.ts";
import { collect, CollectResult } from "./update.ts";
import { associateByFile, type FileUpdate, writeFileUpdate } from "./file.ts";
import { LatestVersionStub } from "./testing.ts";

function toName(path: string) {
  const base = basename(path);
  return base === "mod.ts" || base.endsWith(".json") || base.endsWith(".jsonc")
    ? basename(dirname(path)) + "/" + base
    : base;
}

async function assertFileUpdateSnapshot(
  t: Deno.TestContext,
  results: FileUpdate[],
) {
  await assertSnapshot(
    t,
    results.map((file) => ({
      dependencies: file.dependencies.map((it) => ({
        code: it.code,
        from: it.from,
        map: it.map
          ? {
            key: it.map.key,
            resolved: it.map.resolved,
          }
          : undefined,
        to: it.to,
      })),
      kind: file.kind,
    })),
  );
}

async function assertFileSystemSnapshot(
  t: Deno.TestContext,
  fs: FileSystemFake,
) {
  await assertSnapshot(
    t,
    Array.from(fs.entries()).map(([, content]) => formatEOL(content, LF)),
  );
}

const fs = new FileSystemFake();
ReadTextFileStub.create(fs, { readThrough: true });
WriteTextFileStub.create(fs);

LatestVersionStub.create({ "deno.land/std": "0.218.0", _: "123.456.789" });

function test(path: string, name = toName(path)) {
  Deno.test("write - " + name, async (t) => {
    let result: CollectResult | undefined = undefined;
    let updates: FileUpdate[] = [];
    await t.step("associateByFile", async () => {
      try {
        result = await collect(new URL(path, import.meta.url), {
          cwd: new URL(dirname(path), import.meta.url),
          lock: path.includes("lockfile"),
        });
        updates = associateByFile(result);
        await assertFileUpdateSnapshot(t, updates);
      } catch (error) {
        if (path.includes("import_map_referred/deno.json")) {
          // deno.json just reffers to another import_map.json
          assertInstanceOf(error, SyntaxError, error);
        } else if (path.includes("lockfile_not_importable/deno.json")) {
          // can't lock an import specifier that is not importable as is
          assertInstanceOf(error, Deno.errors.NotSupported);
        } else {
          throw error;
        }
      }
    });
    await t.step("writeFileUpdate", async () => {
      fs.clear();
      if (result) {
        await writeFileUpdate(updates);
        await assertFileSystemSnapshot(t, fs);
        for await (const content of fs.values()) {
          assert(content.endsWith("\n"), "should end with a newline");
        }
      }
    });
  });
}

// Test the all cases in test/data
for await (
  const testCase of Deno.readDir(new URL("../test/data", import.meta.url))
) {
  if (testCase.isFile && testCase.name.endsWith(".ts")) {
    test(`../test/data/${testCase.name}`);
  }
  if (testCase.isDirectory) {
    for await (
      const entry of Deno.readDir(
        new URL("../test/data/" + testCase.name, import.meta.url),
      )
    ) {
      if (
        entry.isFile && entry.name === "mod.ts" ||
        entry.name.endsWith(".json") || entry.name.endsWith(".jsonc")
      ) {
        test(`../test/data/${testCase.name}/${entry.name}`);
      }
    }
  }
}
