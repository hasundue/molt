import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assert,
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { catchMe, ensurePath, isCatchMe, sayCatchMe } from "./utils.ts";

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

describe("catchMe()", () => {
  it("returns a CatchMe object", () => {
    assert(isCatchMe(
      catchMe(() => 1),
    ));
  });
  it("`catch` method of CatchMe returns a value", () => {
    assertEquals(
      catchMe(() => 1).catch(() => 2),
      1,
    );
  });
  it("`catchWith` method of CatchMe returns a value", () => {
    assertEquals(
      catchMe(() => 1).catchWith(2),
      1,
    );
  });
});

describe("sayCatchMe()", () => {
  it("returns a function that returns CatchMe object", () => {
    assert(isCatchMe(
      sayCatchMe(() => 1)(),
    ));
  });
});
