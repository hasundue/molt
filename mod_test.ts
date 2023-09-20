import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  collectDependencyUpdates,
  execDependencyUpdate,
  execDependencyUpdateAll,
  type DependencyUpdate,
} from "./mod.ts";
import { log } from "./src/utils.ts";

describe("collectDependencyUpdates()", () => {
  it("https://deno.land/x/deno_graph", async () => {
    const updates = await collectDependencyUpdates(
      "./src/fixtures/mod.ts",
    );
    log.debug(updates);
    assertEquals(updates.length, 4);
  });
});

describe("execModuleUpdate", () => {
  let updates: DependencyUpdate[];
  beforeAll(async () => {
    updates = await collectDependencyUpdates(
      "./src/fixtures/mod.ts",
    );
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = updates.find((update) =>
      update.specifier.includes("deno.land/x/deno_graph")
    )!;
    const result = await execDependencyUpdate(update);
    assertExists(result);
    assertExists(result.content);
    log.debug(result.content);
  });
  it("npm:node-emoji", async () => {
    const update = updates.find((update) =>
      update.specifier.includes("node-emoji")
    )!;
    const result = await execDependencyUpdate(update);
    assertExists(result);
    assertExists(result.content);
    log.debug(result.content);
  });
});

describe("execModuleUpdateJsonAll", () => {
  let updates: DependencyUpdate[];
  beforeAll(async () => {
    updates = await collectDependencyUpdates(
      "./src/fixtures/mod.ts",
    );
  });
  it("src/fixtures/mod.ts", async () => {
    const results = await execDependencyUpdateAll(updates);
    assertEquals(results.length, 4);
  });
  it("https://deno.land/std", async () => {
    const results = await execDependencyUpdateAll(
      updates.filter((update) => update.specifier.includes("deno.land/std")),
    );
    assertEquals(results.length, 2);
    for (const result of results) {
      assertExists(result.content);
      log.debug(result.content);
    }
  });
});
