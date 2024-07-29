import { assertEquals } from "@std/assert";
import { resolve } from "@std/path";
import { toPath, toUrl } from "./path.ts";

const isWindows = Deno.build.os === "windows";

Deno.test("toUrl (common)", () => {
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
});

Deno.test("toUrl (UNIX)", { ignore: isWindows }, () => {
  assertEquals(
    toUrl("/foo/bar"),
    "file:///foo/bar",
  );
  assertEquals(
    toUrl("foo/bar"),
    "file://" + resolve("foo/bar"),
  );
});

Deno.test("toUrl (Windows)", { ignore: !isWindows }, () => {
  assertEquals(
    toUrl("C:\\foo\\bar"),
    "file:///C:/foo/bar",
  );
  assertEquals(
    toUrl("foo\\bar"),
    "file:///" + resolve("foo\\bar").replace(/\\/g, "/"),
  );
});

Deno.test("toPath (common)", () => {
  assertEquals(
    toPath("https://example.com"),
    "https://example.com",
  );
  assertEquals(
    toPath(new URL("https://example.com")),
    "https://example.com/",
  );
});

Deno.test("toPath (UNIX)", { ignore: isWindows }, () => {
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

Deno.test("toPath (Windows)", { ignore: !isWindows }, () => {
  assertEquals(
    toPath("file:///C:\\foo\\bar"),
    "C:\\foo\\bar",
  );
  assertEquals(
    toPath("C:\\foo\\bar"),
    "C:\\foo\\bar",
  );
  assertEquals(
    toPath("foo\\bar"),
    resolve("foo\\bar"),
  );
});
