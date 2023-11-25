import { assertEquals, assertThrows } from "./std/assert.ts";
import { filterKeys } from "./std/collections.ts";
import { basename } from "./std/path.ts";
import { assertSnapshot } from "./testing.ts";
import { LatestSemVerStub } from "./testing.ts";
import { type SemVerString } from "./semver.ts";
import { collect, DependencyUpdate, getVersionChange } from "./update.ts";

const test = (path: string, name = basename(path)) =>
  Deno.test("collect - " + name, async (t) => {
    const updates = await collect(new URL(path, import.meta.url), {
      findImportMap: true,
    });
    for (const update of updates) {
      await assertUpdateSnapshot(t, update);
    }
  });

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

const LATEST = "123.456.789" as SemVerString;
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
      if (entry.isFile && entry.name === "mod.ts") {
        test(`../test/data/${testCase.name}/mod.ts`, testCase.name);
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
