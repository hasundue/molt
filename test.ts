import { assertEquals } from "https://deno.land/std@0.201.0/assert/mod.ts";
import { collectDependencyUpdateJson } from "./mod.ts";

Deno.test("updateModule", async () => {
  await collectDependencyUpdateJson("./mod.ts");
});
