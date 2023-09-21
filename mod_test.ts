import {
  beforeAll,
  describe,
  it,
} from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { stub } from "https://deno.land/std@0.202.0/testing/mock.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  collectDependencyUpdateAll,
  type DependencyUpdate,
  exec,
  execAll,
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

Deno.test("writeAll", async () => {
  const output = new Map<string, string>();
  const writeTextFileStub = stub(
    Deno,
    "writeTextFile", // deno-lint-ignore require-await
    async (path, data) => {
      output.set(path.toString(), data.toString());
    },
  );
  const results = execAll(
    await collectDependencyUpdateAll("./src/fixtures/mod.ts"),
  );
  try {
    await writeAll(results);
    for (const [file, content] of output.entries()) {
      log.debug(file);
      log.debug(content);
    }
    assertExists(output.get("src/fixtures/mod.ts"));
    assertExists(output.get("src/fixtures/lib.ts"));
  } finally {
    writeTextFileStub.restore();
  }
});
