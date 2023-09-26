import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { assertThrows } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { assertFilePath } from "./utils.ts";

describe("assertFilePath()", () => {
  it("throws on invalid file paths", () => {
    assertThrows(() => assertFilePath("https://deno.land/x/deno_graph/mod.ts"));
    assertThrows(() => assertFilePath("file:///mod.ts"));
  });
  it("does not throw on valid file paths", () => {
    assertFilePath("mod.ts");
    assertFilePath("src/fixtures/mod.ts");
    assertFilePath("./mod.ts");
    assertFilePath("../src/core.ts");
    assertFilePath("/");
    assertFilePath("/home");
  });
});
