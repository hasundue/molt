import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { removeSemVer } from "./lib.ts";

Deno.test("removeSemVer", () => {
  assertEquals(
    removeSemVer("https://deno.land/std@0.200.0/testing/mod.ts"),
    "https://deno.land/std/testing/mod.ts",
  );
});
