import { describe, it } from "./std/testing.ts";
import { assertEquals } from "./std/assert.ts";
import { Dependency, parseSemVer } from "./dependency.ts";
import { Path, SemVerString } from "./types.ts";

describe("parseSemVer", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseSemVer("https://deno.land/std@0.1.0"),
      "0.1.0",
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseSemVer("https://deno.land/std"),
      undefined,
    ));
});

describe("parseProps()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/std@0.1.0/version.ts"),
      ),
      {
        name: "deno.land/std",
        version: "0.1.0" as SemVerString,
        path: "/version.ts" as Path,
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/std/version.ts"),
      ),
      {
        name: "deno.land/std/version.ts",
      },
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("https://deno.land/x/hono@v0.1.0"),
      ),
      {
        name: "deno.land/x/hono",
        version: "v0.1.0" as SemVerString,
        path: "" as Path,
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      Dependency.parseProps(
        new URL("npm:node-emoji@1.0.0"),
      ),
      {
        name: "node-emoji",
        version: "1.0.0" as SemVerString,
        path: "" as Path,
      },
    ));
});
