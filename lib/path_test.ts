import { assertEquals, assertRejects } from "./std/assert.ts";
import { findFileUp } from "./path.ts";

Deno.test("findFileUp", async () => {
  assertEquals(
    await findFileUp(new URL(import.meta.url), "deno.json"),
    new URL("../deno.json", import.meta.url).pathname,
  );
  // Does not accept a file URI (file:///...)
  assertRejects(
    () => findFileUp(import.meta.url, "deno.json"),
  );
});
