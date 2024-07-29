import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { parse } from "./specs.ts";
import { get } from "./updates.ts";
import { MOLT_VERSION } from "./internal.ts";

describe("get", () => {
  const latest = MOLT_VERSION;

  it("should get a released update to deno.land/std", async () => {
    const dep = parse("https://deno.land/std@0.220.0/bytes/copy.ts");
    assertEquals(await get(dep), {
      released: "0.224.0",
    });
  });

  it("should return undefined for an up-to-date dep", async () => {
    const dep = parse("https://deno.land/std@0.224.0/bytes/copy.ts");
    assertEquals(await get(dep), undefined);
  });

  it("should get an update to deno.land/x/molt", async () => {
    const dep = parse("https://deno.land/x/molt@0.17.0/mod.ts");
    assertEquals(await get(dep), {
      released: "0.17.2",
    });
  });

  it("should get an update to a http dep with a v-lead semver", async () => {
    const dep = parse("https://deno.land/x/flash@v0.8.0");
    assertEquals(await get(dep), {
      released: "v0.8.1",
    });
  });

  it("should get an update to a fixed jsr dep", async () => {
    const dep = parse("jsr:@molt/core@0.18.0");
    assertEquals(await get(dep), {
      released: "0.18.5",
      latest,
    });
  });

  it("should get an update to a jsr dep", async () => {
    const dep = parse("jsr:@molt/core@^0.18.0");
    assertEquals(await get(dep), {
      constrainted: "0.18.5",
      latest,
    });
  });

  it("should get a constrainted update to an outdated locked jsr dep", async () => {
    const dep = {
      ...parse("jsr:@molt/core@^0.18.0"),
      locked: "0.18.2",
    };
    assertEquals(await get(dep), {
      constrainted: "0.18.5",
      latest,
    });
  });

  it("should not get a released update to a jsr dep locked to the latest", async () => {
    const dep = {
      ...parse("jsr:@molt/core@^0.18.0"),
      locked: "0.18.5",
    };
    assertEquals(await get(dep), {
      latest,
    });
  });

  it("should get an update to a npm dep", async () => {
    const dep = parse("npm:@conventional-commits/parser@^0.3.0");
    assertEquals(await get(dep), {
      constrainted: "0.3.0",
      released: "0.4.1",
    });
  });
});
