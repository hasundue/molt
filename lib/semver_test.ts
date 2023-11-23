import { assertEquals } from "./std/assert.ts";
import { SemVerString } from "./semver.ts";

Deno.test("SemVerString.parse()", () => {
  assertEquals(
    SemVerString.extract("https://deno.land/std@0.1.0"),
    "0.1.0",
  );
  assertEquals(
    SemVerString.extract("https://deno.land/std"),
    undefined,
  );
  assertEquals(
    SemVerString.extract("https://deno.land/std@1.0.0-rc.1"),
    "1.0.0-rc.1",
  );
});

Deno.test("SemVerString.isPreRelease()", () => {
  assertEquals(
    SemVerString.isPreRelease("0.1.0" as SemVerString),
    false,
  );
  assertEquals(
    SemVerString.isPreRelease("0.1.0-alpha.1" as SemVerString),
    true,
  );
  assertEquals(
    SemVerString.isPreRelease("0.1.0-rc.1" as SemVerString),
    true,
  );
});
