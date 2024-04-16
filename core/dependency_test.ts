import { afterAll, beforeAll, describe, it } from "@std/testing/bdd";
import { assertEquals, assertExists, assertObjectMatch } from "@std/assert";
import { LatestVersionStub } from "@molt/lib/testing";
import { isPreRelease, parse, resolveLatestVersion } from "./dependency.ts";

describe("parse", () => {
  it("deno.land/std", () =>
    assertObjectMatch(
      parse(
        new URL("https://deno.land/std@0.1.0/version.ts"),
      ),
      {
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));

  it("deno.land/std (no semver)", () =>
    assertObjectMatch(
      parse(
        new URL("https://deno.land/std/version.ts"),
      ),
      {
        name: "deno.land/std/version.ts",
      },
    ));

  it("deno.land/x/ (with a leading 'v')", () =>
    assertObjectMatch(
      parse(
        new URL("https://deno.land/x/hono@v0.1.0"),
      ),
      {
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));

  it("npm:", () =>
    assertObjectMatch(
      parse(
        new URL("npm:node-emoji@1.0.0"),
      ),
      {
        name: "node-emoji",
        version: "1.0.0",
        path: "",
      },
    ));

  it("cdn.jsdelivr.net/gh", () =>
    assertObjectMatch(
      parse(
        new URL("https://cdn.jsdelivr.net/gh/hasundue/molt@e4509a9/mod.ts"),
      ),
      {
        name: "cdn.jsdelivr.net/gh/hasundue/molt",
        version: "e4509a9",
        path: "/mod.ts",
      },
    ));

  it("jsr:", () =>
    assertObjectMatch(
      parse(new URL("jsr:@luca/flag@^1.0.0/flag.ts")),
      {
        name: "@luca/flag",
        version: "^1.0.0",
        path: "/flag.ts",
      },
    ));
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
  let stub: LatestVersionStub;

  beforeAll(() => {
    stub = LatestVersionStub.create(LATEST);
  });

  afterAll(() => {
    stub.restore();
  });

  it("https://deno.land/std/version.ts", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("https://deno.land/std/version.ts")),
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
      parse(new URL("https://deno.land/std@0.200.0/version.ts")),
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
      parse(new URL("https://deno.land/std@0.200.0/assert/mod.ts")),
    );
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "deno.land/std",
      version: LATEST,
      path: "/assert/mod.ts",
    });
  });

  it("npm:@alice/foo@1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("npm:@alice/foo@1.0.0")),
    );
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "@alice/foo",
      version: LATEST,
    });
  });

  it("npm:bob/foo@~1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("npm:bob/foo@~1.0.0")),
    );
    // Do not update a version constraint.
    assertEquals(updated, undefined);
  });

  it("npm:bob/bar@^1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("npm:bob/bar@^1.0.0")),
    );
    // Do not update a version constraint.
    assertEquals(updated, undefined);
  });

  it("npm:node-emoji@2", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("npm:node-emoji@2")),
    );
    // Do not update a version constraint.
    assertEquals(updated, undefined);
  });

  it("jsr:@alice/foo@1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("jsr:@scope/foo@1.0.0")),
    );
    assertExists(updated);
    assertObjectMatch(updated, {
      name: "@scope/foo",
      version: LATEST,
    });
  });

  it("jsr:@bob/foo@~1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("jsr:@bob/foo@~1.0.0")),
    );
    // Do not update a version constraint.
    assertEquals(updated, undefined);
  });

  it("jsr:@bob/bar@^1.0.0", async () => {
    const updated = await resolveLatestVersion(
      parse(new URL("jsr:@luca/flag@^1.0.0")),
    );
    // Do not update a version constraint.
    assertEquals(updated, undefined);
  });
});

describe("resolveLatestVersion - pre-release", () => {
  let stub: LatestVersionStub;

  beforeAll(() => {
    stub = LatestVersionStub.create("123.456.789-alpha.1");
  });

  afterAll(() => {
    stub.restore();
  });

  it("deno.land", async () =>
    assertEquals(
      await resolveLatestVersion(
        parse(
          new URL("https://deno.land/x/deno_graph@0.50.0/mod.ts"),
        ),
      ),
      undefined,
    ));

  it("npm", async () =>
    assertEquals(
      await resolveLatestVersion(
        parse(
          new URL("npm:node-emoji@1.0.0"),
        ),
      ),
      undefined,
    ));
});
