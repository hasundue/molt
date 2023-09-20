import { describe, it } from "https://deno.land/std@0.202.0/testing/bdd.ts";
import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.202.0/assert/mod.ts";
import { createDependencyUpdate, parseDependencyProps } from "./core.ts";
import { log } from "./utils.ts";

describe("parseDependencyProps()", () => {
  it("https://deno.land/std", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/std@0.1.0/version.ts"),
      {
        specifier: "https://deno.land/std@0.1.0/version.ts",
        name: "deno.land/std",
        version: "0.1.0",
        path: "/version.ts",
      },
    ));
  it("https://deno.land/std (no semver)", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/std/version.ts"),
      undefined,
    ));
  it("https://deno.land/x/hono (with a leading 'v')", () =>
    assertEquals(
      parseDependencyProps("https://deno.land/x/hono@v0.1.0"),
      {
        specifier: "https://deno.land/x/hono@v0.1.0",
        name: "deno.land/x/hono",
        version: "v0.1.0",
        path: "",
      },
    ));
  it("npm:node-emoji", () =>
    assertEquals(
      parseDependencyProps("npm:node-emoji@1.0.0"),
      {
        specifier: "npm:node-emoji@1.0.0",
        name: "node-emoji",
        version: "1.0.0",
        path: "",
      },
    ));
});

describe("createDependencyUpdate()", () => {
  it("https://deno.land/std", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std@0.1.0/version.ts",
    });
    assertExists(update);
    log.debug(update.version);
  });
  it("https://deno.land/std - no semver", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/std/version.ts",
    });
    assertEquals(update, undefined);
  });
  it("https://deno.land/x/deno_graph", async () => {
    const update = await createDependencyUpdate({
      specifier: "https://deno.land/x/deno_graph@0.1.0/mod.ts",
    });
    assertExists(update);
    log.debug(update.version);
  });
  it("npm:node-emoji", async () => {
    const update = await createDependencyUpdate({
      specifier: "npm:node-emoji@1.0.0",
    });
    assertExists(update);
    log.debug(update.version);
  });
});
