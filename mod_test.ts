import {
  afterAll,
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { type Stub, stub } from "https://deno.land/std@0.202.0/testing/mock.ts";
import {
  assertNotEquals,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  applyDependencyUpdate,
  applyDependencyUpdateToImportMap,
  collectDependencyUpdateAll,
  type DependencyUpdate,
  execDependencyUpdateAll,
  type FileUpdate,
  writeModuleContentUpdateAll,
} from "./mod.ts";

describe("collectDependencyUpdates()", () => {
  it("src/fixtures/mod.ts", async () => {
    const updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
    assertEquals(updates.length, 4);
  });
  it("src/fixtures/import_maps.ts", async () => {
    const updates = await collectDependencyUpdateAll(
      "./src/fixtures/import_maps.ts",
      {
        importMap: "src/fixtures/_deno.json",
      },
    );
    assertEquals(updates.length, 4);
  });
});

describe("applyDependencyUpdate", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
    content = Deno.readTextFileSync("./src/fixtures/mod.ts");
  });
  it("https://deno.land/x/deno_graph", () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/x/deno_graph")
    )!;
    const result = applyDependencyUpdate(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
  it("npm:node-emoji", () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = applyDependencyUpdate(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
});

describe("applyDependencyUpdateToImportMap", () => {
  let updates: DependencyUpdate[];
  let content: string;
  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/import_maps.ts",
      { importMap: "src/fixtures/_deno.json" },
    );
    content = await Deno.readTextFile("src/fixtures/_deno.json");
  });
  it("deno_graph", () => {
    const update = updates.find((update) =>
      update.code.specifier === "deno_graph"
    )!;
    const result = applyDependencyUpdateToImportMap(
      update,
      content,
    );
    assertExists(result);
    assertNotEquals(result, content);
  });
});

describe("execDependencyUpdateAll", () => {
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
  let results: FileUpdate[];

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
