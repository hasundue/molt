import { assertEquals } from "./std/assert.ts";
import { extract, isPreRelease } from "./semver.ts";

Deno.test("extract", () => {
  assertEquals(
    extract("https://deno.land/std@0.1.0"),
    "0.1.0",
  );
  assertEquals(
    extract("https://deno.land/std"),
    undefined,
  );
  assertEquals(
    extract("https://deno.land/std@1.0.0-rc.1"),
    "1.0.0-rc.1",
  );
});

Deno.test("isPreRelease()", () => {
  assertEquals(
    isPreRelease("0.1.0"),
    false,
  );
  assertEquals(
    isPreRelease("0.1.0-alpha.1"),
    true,
  );
  assertEquals(
    isPreRelease("0.1.0-rc.1"),
    true,
  );
});
