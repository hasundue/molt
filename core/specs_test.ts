import { assertEquals, assertThrows } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { identify, parse, stringify, tryParse } from "./specs.ts";

describe("parse", () => {
  it("should parse a jsr specifier", () => {
    assertEquals(
      parse("jsr:@std/fs@^0.222.0/exists"),
      {
        kind: "jsr",
        name: "@std/fs",
        constraint: "^0.222.0",
        path: "/exists",
      },
    );
  });

  it("should parse a npm specifier", () => {
    assertEquals(
      parse("npm:hono@v4.0.0"),
      {
        kind: "npm",
        name: "hono",
        constraint: "v4.0.0",
      },
    );
  });

  it("should parse a url specifier", () => {
    assertEquals(
      parse("https://deno.land/std@0.1.0/assert/mod.ts"),
      {
        kind: "https",
        name: "deno.land/std",
        constraint: "0.1.0",
        path: "/assert/mod.ts",
      },
    );
  });

  it("should throws for a url specifier without version constraint", () => {
    assertThrows(() => parse("https://deno.land/std/assert/mod.ts"));
  });

  it("should parse a non-semver version constraint", () => {
    assertEquals(
      parse("https://cdn.jsdelivr.net/gh/hasundue/molt@e4509a9/mod.ts"),
      {
        kind: "https",
        name: "cdn.jsdelivr.net/gh/hasundue/molt",
        constraint: "e4509a9",
        path: "/mod.ts",
      },
    );
  });
});

describe("tryParse", () => {
  it("should return `undefined` for an invalid specifier", () => {
    assertEquals(tryParse("invalid"), undefined);
  });

  it("should return `undefined` for a specifier without constraint", () => {
    assertEquals(tryParse("https://deno.land/std/fs/mod.ts"), undefined);
  });
});

describe("stringify", () => {
  it("full", () => {
    assertEquals(
      stringify(
        parse("https://deno.land/std@0.1.0/assert/mod.ts"),
      ),
      "https://deno.land/std@0.1.0/assert/mod.ts",
    );
  });

  it("without protocol", () => {
    assertEquals(
      stringify(
        parse("https://deno.land/std@0.1.0/assert/mod.ts"),
        "name",
        "constraint",
        "path",
      ),
      "deno.land/std@0.1.0/assert/mod.ts",
    );
  });

  it("without version", () => {
    assertEquals(
      stringify(
        parse("https://deno.land/std@0.1.0/assert/mod.ts"),
        "kind",
        "name",
        "path",
      ),
      "https://deno.land/std/assert/mod.ts",
    );
  });

  it("name only", () => {
    assertEquals(
      stringify(
        parse("https://deno.land/std@0.1.0/assert/mod.ts"),
        "name",
      ),
      "deno.land/std",
    );
  });
});

describe("identify", () => {
  it("should return the full specifier for a remote dependency", () => {
    assertEquals(
      identify(parse("https://deno.land/std@0.200.0/fs/mod.ts")),
      "https://deno.land/std@0.200.0/fs/mod.ts",
    );
  });

  it("should return a specifier without path for a package dependency", () => {
    assertEquals(
      identify(parse("jsr:@std/fs@^0.222.0/copy")),
      "jsr:@std/fs@^0.222.0",
    );
  });
});
