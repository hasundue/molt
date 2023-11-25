import { assertEquals, assertRejects } from "./std/assert.ts";
import { dirname, resolve } from "./std/path.ts";
import { findFileUp, toPath, toUrl } from "./path.ts";

Deno.test("toUrl", () => {
  assertEquals(
    toUrl("https://example.com"),
    "https://example.com",
  );
  assertEquals(
    toUrl(new URL("https://example.com")),
    "https://example.com/",
  );
  assertEquals(
    toUrl("file:///foo/bar"),
    "file:///foo/bar",
  );
  assertEquals(
    toUrl("/foo/bar"),
    "file:///foo/bar",
  );
  assertEquals(
    toUrl("foo/bar"),
    "file://" + resolve("foo/bar"),
  );
});

Deno.test("toPath", () => {
  assertEquals(
    toPath("https://example.com"),
    "https://example.com",
  );
  assertEquals(
    toPath(new URL("https://example.com")),
    "https://example.com/",
  );
  assertEquals(
    toPath("file:///foo/bar"),
    "/foo/bar",
  );
  assertEquals(
    toPath("/foo/bar"),
    "/foo/bar",
  );
  assertEquals(
    toPath("foo/bar"),
    resolve("foo/bar"),
  );
});

Deno.test("findFileUp", async () => {
  const dir = dirname(toPath(import.meta.url));
  assertEquals(
    await findFileUp(dir, "deno.json"),
    new URL("../deno.json", import.meta.url).pathname,
  );
  // Throws for a non-directory path
  assertRejects(
    () => findFileUp(import.meta.url, "deno.json"),
  );
});
