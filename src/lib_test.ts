import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import { assertEquals } from "https://deno.land/std@0.202.0/assert/mod.ts";
import { parseSemVer, removeSemVer, replaceSemVer } from "./lib.ts";

describe("removeSemVer", () =>
  assertEquals(
    removeSemVer("https://deno.land/std@0.200.0/testing/mod.ts"),
    "https://deno.land/std/testing/mod.ts",
  ));

describe("parseSemVer", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseSemVer("https://deno.land/std@0.1.0")?.minor,
      1,
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseSemVer("https://deno.land/std"),
      undefined,
    ));
});

describe("replaceSemVer", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      replaceSemVer(
        "https://deno.land/std@0.1.0/version.ts",
        "0.2.0",
      ),
      "https://deno.land/std@0.2.0/version.ts",
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      replaceSemVer(
        "https://deno.land/std/version.ts",
        "0.2.0",
      ),
      "https://deno.land/std/version.ts",
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      replaceSemVer(
        "https://deno.land/x/hono@v0.1.0",
        "v0.2.0",
      ),
      "https://deno.land/x/hono@v0.2.0",
    ));
});
