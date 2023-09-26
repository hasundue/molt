import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { readFromJson } from "./import_map.ts";
import { toFileSpecifier } from "./utils.ts";

describe("readFromJson", () => {
  it("src/fixtures/deno.json", async () => {
    const importMap = await readFromJson("src/fixtures/deno.json");
    assertExists(importMap);
    assertEquals(
      importMap.tryResolve("lodash", toFileSpecifier("mod.ts")),
      "https://esm.sh/lodash@4.17.21",
    );
  });
});
