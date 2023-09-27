import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { assertThrows } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { ensurePath } from "./utils.ts";

describe("ensureFilePath()", () => {
  it("throws on invalid file paths", () => {
    assertThrows(() => ensurePath("https://deno.land/x/deno_graph/mod.ts"));
    assertThrows(() => ensurePath("file:///mod.ts"));
  });
  it("does not throw on valid file paths", () => {
    ensurePath("mod.ts");
    ensurePath("src/fixtures/mod.ts");
    ensurePath("./mod.ts");
    ensurePath("../src/core.ts");
    ensurePath("/");
    ensurePath("/home");
  });
});
