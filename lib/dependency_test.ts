import { afterAll, beforeAll, describe, it } from "./std/testing.ts";
import { assertEquals, assertExists, assertObjectMatch } from "./std/assert.ts";
import { isPreRelease, parse, resolveLatestVersion } from "./dependency.ts";
import { LatestSemVerStub } from "./testing.ts";

describe("parse", () => {
  it("deno.land/std", () =>
    assertObjectMatch(
      parse("https://deno.land/std@0.1.0/version.ts")[0],
      {
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));

  it("deno.land/std (no semver)", () =>
    assertObjectMatch(
      parse("https://deno.land/std/version.ts")[0],
      {
        name: "deno.land/std/version.ts",
      },
    ));

  it("deno.land/x/ (with a leading 'v')", () =>
    assertObjectMatch(
      parse("https://deno.land/x/hono@v0.1.0")[0],
      {
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));

  it("npm:", () =>
    assertObjectMatch(
      parse("npm:node-emoji@1.0.0")[0],
      {
        name: "node-emoji",
        version: "1.0.0",
        path: "",
      },
    ));

  it("cdn.jsdelivr.net/gh", () =>
    assertObjectMatch(
      parse("https://cdn.jsdelivr.net/gh/hasundue/molt@e4509a9/mod.ts")[0],
      {
        name: "cdn.jsdelivr.net/gh/hasundue/molt",
        version: "e4509a9",
        path: "/mod.ts",
      },
    ));

  it("raw.githubusercontent.com", () => {
    const candidates = parse(
      "https://raw.githubusercontent.com/hasundue/molt/e4509a9/mod.ts",
    );
    assertEquals(candidates.length, 5);
    assertEquals(
      candidates[0],
      {
        protocol: "https:",
        name: "raw.githubusercontent.com/hasundue/molt/e4509a9/mod.ts",
        path: "",
      },
    );
    assertEquals(
      candidates[1],
      {
        protocol: "https:",
        name: "raw.githubusercontent.com/hasundue/molt",
        version: "e4509a9",
        path: "/mod.ts",
      },
    );
  });
});

Deno.test("isPreRelease", () => {
  assertEquals(
    isPreRelease("0.1.0"),
    false,
  );
  assertEquals(
    isPreRelease("0.1.0-alpha.1"),
    true,
  );
  assertEquals(
    isPreRelease("0.1.0-rc.1"),
    true,
  );
});

describe("resolveLatestVersion", () => {
  const LATEST = "123.456.789";
  let stub: LatestSemVerStub;

  beforeAll(() => {
    stub = LatestSemVerStub.create(LATEST);
  });

  afterAll(() => {
    stub.restore();
  });

  it("https://deno.land/std/version.ts", async () => {
    const updated = await resolveLatestVersion(
      parse("https://deno.land/std/version.ts")[0],
    );
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "deno.land/std",
      version: LATEST,
      path: "/version.ts",
    });
  });

  it("https://deno.land/std@0.200.0/version.ts", async () => {
    const updated = await resolveLatestVersion(
      parse("https://deno.land/std@0.200.0/version.ts")[0],
    )!;
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "deno.land/std",
      version: LATEST,
      path: "/version.ts",
    });
  });

  it("https://deno.land/std@0.200.0/assert/mod.ts", async () => {
    const updated = await resolveLatestVersion(
      parse("https://deno.land/std@0.200.0/assert/mod.ts")[0],
    );
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "deno.land/std",
      version: LATEST,
      path: "/assert/mod.ts",
    });
  });
});

describe("resolveLatestVersion - pre-release", () => {
  let stub: LatestSemVerStub;

  beforeAll(() => {
    stub = LatestSemVerStub.create("123.456.789-alpha.1");
  });

  afterAll(() => {
    stub.restore();
  });

  it("deno.land", async () =>
    assertEquals(
      await resolveLatestVersion(
        parse("https://deno.land/x/deno_graph@0.50.0/mod.ts")[0],
      ),
      undefined,
    ));

  it("npm", async () =>
    assertEquals(
      await resolveLatestVersion(
        parse("npm:node-emoji@1.0.0")[0],
      ),
      undefined,
    ));
});
