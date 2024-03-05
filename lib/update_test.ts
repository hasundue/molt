import { dirname } from "./std/path.ts";
import { assertEquals, assertThrows } from "./std/assert.ts";
import { filterKeys } from "./std/collections.ts";
import { basename } from "./std/path.ts";
import { assertSnapshot } from "./testing.ts";
import { LatestSemVerStub } from "./testing.ts";
import { readImportMapJson } from "./import_map.ts";
import { collect, DependencyUpdate, getVersionChange } from "./update.ts";

function test(
  path: string,
  name = basename(path),
  variation?: string,
) {
  Deno.test(
    "collect - " + (variation ? `${name} - ${variation}` : name),
    async (t) => {
      const updates = await collect(new URL(path, import.meta.url), {
        cwd: new URL(dirname(path), import.meta.url),
      });
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    },
  );
}

async function assertUpdateSnapshot(
  t: Deno.TestContext,
  update: DependencyUpdate,
) {
  await assertSnapshot(
    t,
    filterKeys(
      // deno-lint-ignore no-explicit-any
      update as Readonly<Record<string, any>>,
      (key) => ["from", "to", "code"].includes(key),
    ),
  );
}

async function hasImportMap(url: URL) {
  try {
    await readImportMapJson(url);
    return true;
  } catch {
    return false;
  }
}

const LATEST = "123.456.789";
LatestSemVerStub.create(LATEST);

// Test collect() for all cases in test/data
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
        entry.name.endsWith(".json") && await hasImportMap(
            new URL(
              `../test/data/${testCase.name}/${entry.name}`,
              import.meta.url,
            ),
          )
      ) {
        test(
          `../test/data/${testCase.name}/${entry.name}`,
          testCase.name,
          entry.name,
        );
      }
    }
  }
}

Deno.test("getVersionChange - single version", () => {
  assertEquals(
    getVersionChange([
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.1.0",
        },
      },
      // deno-lint-ignore no-explicit-any
    ] as any),
    {
      from: "0.0.1",
      to: "0.1.0",
    },
  );
});

Deno.test("getVersionChange - multiple versions with different names", () => {
  assertEquals(
    getVersionChange([
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.1.0",
        },
      },
      {
        from: {
          name: "node-emoji",
          version: "0.0.1",
        },
        to: {
          name: "node-emoji",
          version: "0.1.0",
        },
      },
      // deno-lint-ignore no-explicit-any
    ] as any),
    undefined,
  );
});

Deno.test("getVersionChange - multiple versions with different `from`s and a common `to`", () => {
  assertEquals(
    getVersionChange([
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.1.0",
        },
      },
      {
        from: {
          name: "deno_graph",
          version: "0.0.2",
        },
        to: {
          name: "deno_graph",
          version: "0.1.0",
        },
      },
      // deno-lint-ignore no-explicit-any
    ] as any),
    {
      from: undefined,
      to: "0.1.0",
    },
  );
});

Deno.test("getVersionChange - multiple versions with a common `from` and `to`", () => {
  assertEquals(
    getVersionChange([
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.2.0",
        },
      },
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.2.0",
        },
      },
      // deno-lint-ignore no-explicit-any
    ] as any),
    {
      from: "0.0.1",
      to: "0.2.0",
    },
  );
});

Deno.test("getVersionChange - multiple versions with a common `from` and different `to`s", () => {
  assertThrows(() =>
    getVersionChange([
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.1.0",
        },
      },
      {
        from: {
          name: "deno_graph",
          version: "0.0.1",
        },
        to: {
          name: "deno_graph",
          version: "0.2.0",
        },
      },
      // deno-lint-ignore no-explicit-any
    ] as any)
  );
});
