import { assertEquals, assertExists, assertThrows } from "@std/assert";
import {
  fromDependency,
  is,
  type Package,
  parse,
  stringify,
  tryParse,
} from "./packages.ts";

Deno.test("parse", () => {
  assertEquals(
    parse("jsr:@std/collections"),
    {
      registry: "jsr",
      scope: "std",
      name: "collections",
    },
  );
  assertThrows(() => parse("std/collections"));
});

Deno.test("tryParse", () => {
  assertEquals(
    tryParse("jsr:@std/collections"),
    {
      registry: "jsr",
      scope: "std",
      name: "collections",
    },
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
    kind: "jsr",
    name: "@std/collections",
    constraint: "0.200.0",
    path: "/fs",
  });
  assertExists(result);
  assertEquals(
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
    kind: "https",
    name: "https://deno.land/std",
    constraint: "0.200.0",
    path: "/fs/mod.ts",
  });
  assertEquals(result, undefined);
});
