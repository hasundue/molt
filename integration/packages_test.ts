import {
  assertEquals,
  assertExists,
  assertObjectMatch,
  assertThrows,
} from "@std/assert";
import {
  fromDependency,
  is,
  type Package,
  parse,
  stringify,
  tryParse,
} from "./packages.ts";

Deno.test("parse", () => {
  assertObjectMatch(
    parse("jsr:@std/collections"),
    {
      registry: "jsr",
      scope: "std",
      name: "collections",
    } satisfies Package,
  );
  assertThrows(() => parse("std/collections"));
});

Deno.test("tryParse", () => {
  assertObjectMatch(
    tryParse("jsr:@std/collections"),
    {
      registry: "jsr",
      scope: "std",
      name: "collections",
    } satisfies Package,
  );
  assertEquals(
    tryParse("std/collections"),
    undefined,
  );
});

Deno.test("stringify", () => {
  assertEquals(
    stringify({
      registry: "jsr",
      scope: "std",
      name: "collections",
    }),
    "jsr:@std/collections",
  );
});

Deno.test("is", () => {
  assertEquals(
    is("jsr:@std/collections", {
      registry: "jsr",
      scope: "std",
      name: "collections",
    }),
    true,
  );
  assertEquals(
    is("std/collections", {
      registry: "jsr",
      scope: "std",
      name: "collections",
    }),
    false,
  );
});

Deno.test("fromDependency - JSR", () => {
  const result = fromDependency({
    protocol: "jsr:",
    name: "@std/collections",
    version: "0.200.0",
    path: "/fs",
  });
  assertExists(result);
  assertObjectMatch(
    result,
    {
      registry: "jsr",
      scope: "std",
      name: "collections",
    } satisfies Package,
  );
});

Deno.test("fromDependency - deno.land", () => {
  const result = fromDependency({
    protocol: "https:",
    name: "https://deno.land/std",
    version: "0.200.0",
    path: "/fs/mod.ts",
  });
  assertEquals(result, undefined);
});
