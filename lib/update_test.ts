// deno-lint-ignore-file no-explicit-any
import { beforeAll, describe, it } from "./std/testing.ts";
import {
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertThrows,
} from "./std/assert.ts";
import { filterKeys } from "./std/collections.ts";
import { assertSnapshot } from "./testing.ts";
import { URI } from "./uri.ts";
import { _create, DependencyUpdate } from "./update.ts";
import { ImportMap } from "./import_map.ts";
import { LatestSemVerStub } from "./testing.ts";
import type { SemVerString } from "./semver.ts";

describe("DependencyUpdate", () => {
  const LATEST = "123.456.789" as SemVerString;

  beforeAll(() => {
    LatestSemVerStub.create(LATEST);
  });

  describe("_create()", () => {
    it("https://deno.land/std", async () => {
      const update = await _create({
        specifier: "https://deno.land/std@0.1.0/version.ts",
        code: {
          span: {},
          specifier: "https://deno.land/std@0.1.0/version.ts",
        } as any,
      }, URI.from("test/data/import.ts"));
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "https://",
          name: "deno.land/std",
          version: "0.1.0",
          path: "/version.ts",
        },
        to: {
          scheme: "https://",
          name: "deno.land/std",
          version: LATEST,
          path: "/version.ts",
        },
        code: {
          specifier: "https://deno.land/std@0.1.0/version.ts",
        },
        referrer: URI.from("test/data/import.ts"),
      });
    });
    it("https://deno.land/std - unversioned", async () => {
      const update = await _create({
        specifier: "https://deno.land/std/version.ts",
        code: {
          span: {},
          specifier: "https://deno.land/std/version.ts",
        } as any,
      }, URI.from("test/data/import.ts"));
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "https://",
          name: "deno.land/std/version.ts",
        },
        to: {
          scheme: "https://",
          name: "deno.land/std",
          version: LATEST,
          path: "/version.ts",
        },
        code: {
          specifier: "https://deno.land/std/version.ts",
        },
      });
    });
    it("https://deno.land/x/deno_graph", async () => {
      const update = await _create({
        specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        code: {
          span: {},
          specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        } as any,
      }, URI.from("test/data/import.ts"));
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "https://",
          name: "deno.land/x/deno_graph",
          version: "0.50.0",
          path: "/mod.ts",
        },
        to: {
          scheme: "https://",
          name: "deno.land/x/deno_graph",
          version: LATEST,
          path: "/mod.ts",
        },
        code: {
          specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
        },
      });
    });
    it("npm:node-emoji", async () => {
      const update = await _create({
        specifier: "npm:node-emoji@2.0.0",
        code: {
          span: {},
          specifier: "npm:node-emoji@2.0.0",
        } as any,
      }, URI.from("test/data/import.ts"));
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "npm:",
          name: "node-emoji",
          version: "2.0.0",
        },
        to: {
          scheme: "npm:",
          name: "node-emoji",
          version: LATEST,
        },
        code: {
          specifier: "npm:node-emoji@2.0.0",
        },
      });
    });
    it("npm:node-emoji - unversioned", async () => {
      const update = await _create({
        specifier: "npm:node-emoji",
        code: {
          span: {},
          specifier: "npm:node-emoji",
        } as any,
      }, URI.from("test/data/import.ts"));
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "npm:",
          name: "node-emoji",
        },
        to: {
          scheme: "npm:",
          name: "node-emoji",
          version: LATEST,
        },
        code: {
          specifier: "npm:node-emoji",
        },
      });
    });
  });

  describe("_create() - with import map", () => {
    let importMap: ImportMap;

    beforeAll(async () => {
      importMap = (await ImportMap.readFromJson(
        URI.from("../test/data/import_map/deno.json", import.meta.url),
      ))!;
    });

    it("std/version.ts", async () => {
      const update = await _create(
        {
          specifier: "std/version.ts",
          code: {
            span: {},
            specifier: "https://deno.land/std@0.200.0/version.ts",
          } as any,
        },
        URI.from("test/data/import_map/mod.ts"),
        { importMap },
      );
      assertExists(update);
      assertObjectMatch(update, {
        from: {
          scheme: "https://",
          name: "deno.land/std",
          version: "0.200.0",
          path: "/",
        },
        to: {
          scheme: "https://",
          name: "deno.land/std",
          version: LATEST,
          path: "/",
        },
        code: {
          specifier: "std/version.ts",
        },
        referrer: URI.from("test/data/import_map/mod.ts"),
        map: {
          source: URI.from("test/data/import_map/deno.json"),
          from: "std/",
          to: "https://deno.land/std@0.200.0/",
        },
      });
    });
  });

  describe("collect()", () => {
    it("multiple imports", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/multiple_imports.ts",
      );
      assertEquals(updates.length, 3);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("import map", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/import_map/mod.ts",
        {
          importMap: "./test/data/import_map/deno.json",
        },
      );
      assertEquals(updates.length, 3);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("export", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/export.ts",
      );
      assertEquals(updates.length, 1);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("import and export", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/import_and_export.ts",
      );
      assertEquals(updates.length, 2);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("updated and outdated", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/updated_and_outdated.ts",
      );
      assertEquals(updates.length, 1);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("updated import and outdated export", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/updated_import_and_outdated_export.ts",
      );
      assertEquals(updates.length, 1);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("ignore a dependency", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/multiple_imports.ts",
        {
          ignore: (dep) => dep.name === "node-emoji",
        },
      );
      assertEquals(updates.length, 2);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
    it("only update a specified dependency", async (t) => {
      const updates = await DependencyUpdate.collect(
        "./test/data/multiple_imports.ts",
        {
          only: (dep) => dep.name.includes("deno_graph"),
        },
      );
      assertEquals(updates.length, 1);
      for (const update of updates) {
        await assertUpdateSnapshot(t, update);
      }
    });
  });

  describe("getVersionChange()", () => {
    it("single version", () => {
      assertEquals(
        DependencyUpdate.getVersionChange([
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
        ] as any),
        {
          from: "0.0.1",
          to: "0.1.0",
        },
      );
    });
    it("multiple versions with different names", () => {
      assertEquals(
        DependencyUpdate.getVersionChange([
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
        ] as any),
        undefined,
      );
    });
    it("multiple versions with different `from`s and a common `to`", () => {
      assertEquals(
        DependencyUpdate.getVersionChange([
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
        ] as any),
        {
          from: undefined,
          to: "0.1.0",
        },
      );
    });
    it("multiple versions with a common `from` and `to`", () => {
      assertEquals(
        DependencyUpdate.getVersionChange([
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
        ] as any),
        {
          from: "0.0.1",
          to: "0.2.0",
        },
      );
    });
    it("multiple versions with a common `from` and different `to`s", () => {
      assertThrows(() =>
        DependencyUpdate.getVersionChange([
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
        ] as any)
      );
    });
  });
});

async function assertUpdateSnapshot(
  t: Deno.TestContext,
  update: DependencyUpdate,
) {
  await assertSnapshot(
    t,
    filterKeys(
      update as Readonly<Record<string, any>>,
      (key) => ["from", "to", "code"].includes(key),
    ),
  );
}
