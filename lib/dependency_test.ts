import { beforeAll, describe, it } from "./std/testing.ts";
import { assertEquals } from "./std/assert.ts";
import { Dependency, parseSemVer } from "./dependency.ts";
import { Path, SemVerString } from "./types.ts";
import { LatestSemVerStub } from "./testing.ts";

describe("parseSemVer()", () => {
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

describe("Dependency.parse()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      Dependency.parse(
        new URL("https://deno.land/std@0.1.0/version.ts"),
      ),
      {
        scheme: "https://",
        name: "deno.land/std",
        version: "0.1.0" as SemVerString,
        path: "/version.ts" as Path,
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      Dependency.parse(
        new URL("https://deno.land/std/version.ts"),
      ),
      {
        scheme: "https://",
        name: "deno.land/std/version.ts",
      },
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      Dependency.parse(
        new URL("https://deno.land/x/hono@v0.1.0"),
      ),
      {
        scheme: "https://",
        name: "deno.land/x/hono",
        version: "v0.1.0" as SemVerString,
        path: "" as Path,
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      Dependency.parse(
        new URL("npm:node-emoji@1.0.0"),
      ),
      {
        scheme: "npm:",
        name: "node-emoji",
        version: "1.0.0" as SemVerString,
        path: "" as Path,
      },
    ));
});

describe("Dependency.toURI()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      Dependency.toURI({
        scheme: "https://",
        name: "deno.land/std",
        version: "0.1.0" as SemVerString,
        path: "/version.ts" as Path,
      }),
      "https://deno.land/std@0.1.0/version.ts",
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      Dependency.toURI({
        scheme: "https://",
        name: "deno.land/std/version.ts",
      }),
      "https://deno.land/std/version.ts",
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      Dependency.toURI({
        scheme: "npm:",
        name: "node-emoji",
        version: "1.0.0" as SemVerString,
        path: "" as Path,
      }),
      "npm:node-emoji@1.0.0",
    ));
});

describe("Dependency.resolveLatest()", () => {
  const LATEST = "123.456.789" as SemVerString;
  beforeAll(() => {
    LatestSemVerStub.create(LATEST);
  });
  it("https://deno.land/std/version.ts", async () =>
    assertEquals(
      await Dependency.resolveLatest(
        Dependency.parse(new URL("https://deno.land/std/version.ts")),
      ),
      {
        scheme: "https://",
        name: "deno.land/std",
        version: LATEST,
        path: "/version.ts" as Path,
      },
    ));
  it("https://deno.land/std@0.200.0/version.ts", async () =>
    assertEquals(
      await Dependency.resolveLatest(
        Dependency.parse(new URL("https://deno.land/std@0.200.0/version.ts")),
      ),
      {
        scheme: "https://",
        name: "deno.land/std",
        version: LATEST,
        path: "/version.ts" as Path,
      },
    ));
  it(
    "https://deno.land/std@0.200.0/assert/assert_equals.ts",
    async () =>
      assertEquals(
        await Dependency.resolveLatest(
          Dependency.parse(
            new URL(
              "https://deno.land/std@0.200.0/assert/assert_equals.ts",
            ),
          ),
        ),
        {
          scheme: "https://",
          name: "deno.land/std",
          version: LATEST,
          path: "/assert/assert_equals.ts" as Path,
        },
      ),
  );
});
