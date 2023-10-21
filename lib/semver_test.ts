import { describe, it } from "./std/testing.ts";
import { assertEquals } from "./std/assert.ts";
import { parseSemVer } from "./semver.ts";

describe("parseSemVer", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseSemVer("https://deno.land/std@0.1.0"),
      "0.1.0",
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseSemVer("https://deno.land/std"),
      undefined,
    ));
});
