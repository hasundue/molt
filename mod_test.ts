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
  collectDependencyUpdateAll,
  type DependencyUpdate,
  exec,
  execAll,
  type ModuleUpdateResult,
  writeAll,
} from "./mod.ts";
import { log } from "./src/utils.ts";

describe("collectDependencyUpdates()", () => {
  it("https://deno.land/x/deno_graph", async () => {
    const updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
    log.debug(updates);
    assertEquals(updates.length, 4);
  });
});

describe("exec", () => {
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
    const result = exec(update);
    assertExists(result);
    assertExists(result.content);
    log.debug(result.content);
  });
  it("npm:node-emoji", () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = exec(update);
    assertExists(result);
    assertExists(result.content);
    log.debug(result.content);
  });
});

describe("execAll", () => {
  let updates: DependencyUpdate[];
  beforeAll(async () => {
    updates = await collectDependencyUpdateAll(
      "./src/fixtures/mod.ts",
    );
  });
  it("src/fixtures/mod.ts", () => {
    const results = execAll(updates);
    results.forEach((r) => log.debug(r.content));
    assertEquals(results.length, 2);
  });
  it("https://deno.land/std", () => {
    const results = execAll(
      updates.filter((update) => update.specifier.includes("deno.land/std")),
    );
    assertEquals(results.length, 2);
    for (const result of results) {
      assertExists(result.content);
      log.debug(result.content);
    }
  });
});

describe("writeAll", () => {
  let output: Map<string, string>;
  let writeTextFileSyncStub: Stub;
  let results: ModuleUpdateResult[];

  beforeAll(async () => {
    output = new Map<string, string>();
    writeTextFileSyncStub = stub(
      Deno,
      "writeTextFileSync", // deno-lint-ignore require-await
      async (path, data) => {
        output.set(path.toString(), data.toString());
      },
    );
    results = execAll(
      await collectDependencyUpdateAll("./src/fixtures/mod.ts"),
    );
  });

  afterAll(() => {
    writeTextFileSyncStub.restore();
  });

  it("src/fixtures/mod.ts", () => {
    writeAll(results);
    for (const [file, content] of output.entries()) {
      log.debug(file);
      log.debug(content);
    }
    assertExists(output.get("src/fixtures/mod.ts"));
    assertExists(output.get("src/fixtures/lib.ts"));
  });
});
