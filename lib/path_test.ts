import { assertEquals } from "./std/assert.ts";
import { join } from "./std/url.ts";
import { findFileUp, toUrl } from "./path.ts";

const CWD = "file:///" + Deno.cwd();

Deno.test("toUrl", () => {
  assertEquals(
    new URL("https://example.com"),
    new URL("https://example.com"),
  );
  assertEquals(
    toUrl("https://example.com"),
    new URL("https://example.com"),
  );
  assertEquals(
    toUrl("file:///a/b/c"),
    new URL("file:///a/b/c"),
  );
  assertEquals(
    toUrl("a/b/c"),
    join(CWD, "a/b/c"),
  );
});

Deno.test("findFileUp", async () => {
  assertEquals(
    await findFileUp(import.meta.url, "deno.json"),
    new URL("../deno.json", import.meta.url),
  );
});
