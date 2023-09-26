import {
  afterAll,
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { type Stub, stub } from "https://deno.land/std@0.202.0/testing/mock.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  applyDependencyUpdate,
  collectDependencyUpdateAll,
  type DependencyUpdate,
  execDependencyUpdateAll,
  type ModuleContentUpdate,
  writeModuleContentUpdateAll,
} from "./mod.ts";

describe("collectDependencyUpdates()", () => {
  it("src/fixtures/mod.ts", async () => {
    const updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
    assertEquals(updates.length, 4);
  });
});

describe("applyDependencyUpdate", () => {
  let updates: DependencyUpdate[];
  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
  });
  it("https://deno.land/x/deno_graph", () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/x/deno_graph")
    )!;
    const result = applyDependencyUpdate(
      update,
      Deno.readTextFileSync(update.referrer),
    );
    assertExists(result);
  });
  it("npm:node-emoji", () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = applyDependencyUpdate(
      update,
      Deno.readTextFileSync(update.referrer),
    );
    assertExists(result);
  });
});

describe("execDependencyUpdateArray", () => {
  let updates: DependencyUpdate[];
  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
  });
  it("src/fixtures/mod.ts", () => {
    const results = execDependencyUpdateAll(updates);
    assertEquals(results.length, 2);
  });
  it("https://deno.land/std", () => {
    const results = execDependencyUpdateAll(
      updates.filter((update) => update.specifier.includes("deno.land/std")),
    );
    assertEquals(results.length, 2);
    for (const result of results) {
      assertExists(result.content);
    }
  });
});

describe("writeAll", () => {
  let output: Map<string, string>;
  let writeTextFileSyncStub: Stub;
  let results: ModuleContentUpdate[];

  beforeAll(async () => {
    output = new Map<string, string>();
    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync", // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );
    results = execDependencyUpdateAll(
      await collectDependencyUpdateAll("./src/fixtures/mod.ts"),
    );
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
  });

  it("src/fixtures/mod.ts", () => {
    writeModuleContentUpdateAll(results);
    assertExists(output.get("src/fixtures/mod.ts"));
    assertExists(output.get("src/fixtures/lib.ts"));
  });
});
