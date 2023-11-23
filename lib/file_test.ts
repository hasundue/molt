import { basename, dirname } from "./std/path.ts";
import { EOL, formatEOL } from "./std/fs.ts";
import {
  FileSystemFake,
  ReadTextFileStub,
  WriteTextFileStub,
} from "./testing.ts";
import { assertSnapshot } from "./testing.ts";
import * as DependencyUpdate from "./update.ts";
import { type FileUpdate, mergeToFileUpdate, writeFileUpdate } from "./file.ts";
import { LatestSemVerStub } from "./testing.ts";
import { SemVerString } from "./semver.ts";

const LATEST = "123.456.789" as SemVerString;
LatestSemVerStub.create(LATEST);

function toName(path: string) {
  const base = basename(path);
  return base === "mod.ts" ? `${basename(dirname(path))}/mod.ts` : base;
}

async function assertCollectSnapshot(
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
            value: it.map.value,
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

async function test(path: string, name = toName(path)) {
  const updates = await DependencyUpdate.collect(
    new URL(path, import.meta.url),
  );
  const results = mergeToFileUpdate(updates);

  Deno.test("collect - " + name, async (t) => {
    await assertCollectSnapshot(t, results);
  });

  Deno.test("write - " + name, async (t) => {
    const fs = new FileSystemFake();
    const readTextFileStub = ReadTextFileStub.create(fs, { readThrough: true });
    const writeTextFileStub = WriteTextFileStub.create(fs);
    await writeFileUpdate(results);
    await assertFileSystemSnapshot(t, fs);
    readTextFileStub.restore();
    writeTextFileStub.restore();
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
