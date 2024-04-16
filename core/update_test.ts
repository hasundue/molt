import { dirname } from "@std/path";
import { assertEquals, assertInstanceOf } from "@std/assert";
import { filterKeys } from "@std/collections/filter-keys";
import { basename, fromFileUrl } from "@std/path";
import { createAssertSnapshot } from "@std/testing/snapshot";
import { LatestVersionStub } from "@molt/lib/testing";
import { collect, type DependencyUpdate } from "./update.ts";

const assertSnapshot = createAssertSnapshot({
  dir: fromFileUrl(new URL("../test/snapshots/", import.meta.url)),
});

function test(
  path: string,
  name = basename(path),
  variation?: string,
) {
  Deno.test(
    "collect - " + (variation ? `${name} - ${variation}` : name),
    async (t) => {
      try {
        const actual = await collect(new URL(path, import.meta.url), {
          cwd: new URL(dirname(path), import.meta.url),
          lock: path.includes("lockfile"),
        });
        const no_cache = await collect(new URL(path, import.meta.url), {
          cache: false,
          cwd: new URL(dirname(path), import.meta.url),
          lock: path.includes("lockfile"),
        });
        assertEquals(actual, no_cache, "cache should not affect results");
        await assertUpdateSnapshot(t, actual.updates);
        if (actual.locks.length) {
          await assertSnapshot(t, actual.locks);
        }
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
    },
  );
}

async function assertUpdateSnapshot(
  t: Deno.TestContext,
  actual: DependencyUpdate[],
) {
  await assertSnapshot(
    t,
    actual.map((update) =>
      filterKeys(
        // deno-lint-ignore no-explicit-any
        update as Readonly<Record<string, any>>,
        (key) => ["from", "to", "code"].includes(key),
      )
    ),
  );
}

LatestVersionStub.create({ "deno.land/std": "0.218.0", _: "123.456.789" });

// Test collect() for all cases in test/cases
for await (
  const testCase of Deno.readDir(new URL("../test/cases", import.meta.url))
) {
  if (testCase.isFile && testCase.name.endsWith(".ts")) {
    test(`../test/cases/${testCase.name}`);
  }
  if (testCase.isDirectory) {
    for await (
      const entry of Deno.readDir(
        new URL("../test/cases/" + testCase.name, import.meta.url),
      )
    ) {
      if (
        entry.isFile && entry.name === "mod.ts" ||
        entry.name.endsWith(".json") || entry.name.endsWith(".jsonc")
      ) {
        test(
          `../test/cases/${testCase.name}/${entry.name}`,
          testCase.name,
          entry.name,
        );
      }
    }
  }
}
