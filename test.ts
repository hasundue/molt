import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import {
  collectDependencyUpdateJson,
  createDependencyUpdateJson,
} from "./mod.ts";
import { console, SEMVER_REGEXP } from "./src/lib.ts";

describe("createDependencyUpdateJson()", () => {
  it("https://deno.land/std", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/std@0.1.0/version.ts",
    });
    assertExists(update);
    assert(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/std/version.ts",
    });
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
    });
    assertExists(update);
    assertExists(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
  it("npm:node-emoji", async () => {
    const update = await createDependencyUpdateJson({
      specifier: "npm:node-emoji@1.0.0",
    });
    assertExists(update);
    assertExists(update.newSpecifier.match(SEMVER_REGEXP));
    console.debug(update.newSpecifier);
  });
});

// describe("collectDependencyUpdateJson()", () => {
//   it("https://deno.land/x/deno_graph", async () => {
//     const updates = await collectDependencyUpdateJson(
//       "./mod.ts",
//     );
//     assert(updates.length > 0);
//     console.debug(updates);
//   });
// });
