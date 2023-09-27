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
    const result = catchMe(() => 1);
    assert(isCatchMe(result));
  });
  it("`catch` method of CatchMe returns a value", () => {
    const result = catchMe(() => 1);
    assert(typeof result.catch === "function");
    const value = result.catch(() => 2);
    assertEquals(value, 1);
  });
  it("`catchWith` method of CatchMe returns a value", () => {
    const result = catchMe(() => 1);
    assert(typeof result.catchWith === "function");
    const value = result.catchWith(2);
    assertEquals(value, 1);
  });
});

describe("sayCatchMe()", () => {
  it("returns a function that returns CatchMe object", () => {
    const fn = sayCatchMe(() => 1);
    assert(typeof fn === "function");
    const result = fn();
    assert(isCatchMe(result));
  });
});
