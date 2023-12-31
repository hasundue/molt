import { basename, dirname } from "./std/path.ts";
import { EOL, formatEOL } from "./std/fs.ts";
import {
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { assertSnapshot } from "./testing.ts";
import * as DependencyUpdate from "./update.ts";
import { associateByFile, type FileUpdate, write } from "./file.ts";
import { LatestSemVerStub } from "./testing.ts";

const LATEST = "123.456.789";
LatestSemVerStub.create(LATEST);

function toName(path: string) {
  const base = basename(path);
  return base === "mod.ts" ? `${basename(dirname(path))}/mod.ts` : base;
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
    Array.from(fs.entries()).map(([, content]) => formatEOL(content, EOL.LF)),
  );
}

const fs = new FileSystemFake();
ReadTextFileStub.create(fs, { readThrough: true });
WriteTextFileStub.create(fs);

async function test(path: string, name = toName(path)) {
  const updates = await DependencyUpdate.collect(
    new URL(path, import.meta.url),
    { findImportMap: true },
  );
  const results = associateByFile(updates);

  Deno.test("associateByFile - " + name, async (t) => {
    await assertFileUpdateSnapshot(t, results);
  });

  Deno.test("write - " + name, async (t) => {
    fs.clear();
    await write(results);
    await assertFileSystemSnapshot(t, fs);
  });
}

// Test the all cases in test/data
for await (
  const testCase of Deno.readDir(new URL("../test/data", import.meta.url))
) {
  if (testCase.isFile && testCase.name.endsWith(".ts")) {
    await test(`../test/data/${testCase.name}`);
  }
  if (testCase.isDirectory) {
    for await (
      const entry of Deno.readDir(
        new URL("../test/data/" + testCase.name, import.meta.url),
      )
    ) {
      if (entry.isFile && entry.name === "mod.ts") {
        await test(`../test/data/${testCase.name}/mod.ts`);
      }
    }
  }
}
