import * as fs from "@chiezo/amber/fs";
import { assertEquals, assertRejects } from "@std/assert";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import dedent from "dedent";
import { readImportMapJson } from "./maps.ts";

describe("readImportMapJson", () => {
  beforeEach(() => {
    fs.stub(".");
    fs.mock();
  });

  afterEach(() => {
    fs.dispose();
  });

  it("should throw for an empty file", async () => {
    await Deno.writeTextFile("a.json", "");
    assertRejects(() => readImportMapJson("a.json"));
  });

  it("should parse an empty JSON", async () => {
    await Deno.writeTextFile("a.json", "{}");
    const actual = await readImportMapJson("a.json");
    assertEquals(actual, {});
  });

  it("should parse a valid import map JSON", async () => {
    await Deno.writeTextFile(
      "a.json",
      dedent`
      {
        "imports": {
          "@std/assert": "jsr:@std/assert@0.222.0",
        }
      }
    `,
    );
    const actual = await readImportMapJson("a.json");
    assertEquals(actual, {
      imports: {
        "@std/assert": "jsr:@std/assert@0.222.0",
      },
    });
  });

  it("should parse a JSON with comments", async () => {
    await Deno.writeTextFile(
      "a.jsonc",
      dedent`
      // This is a comment.
      {
        "imports": {
          "@std/assert": "jsr:@std/assert@0.222.0",
        }
      }
    `,
    );
    const actual = await readImportMapJson("a.jsonc");
    assertEquals(actual, {
      imports: {
        "@std/assert": "jsr:@std/assert@0.222.0",
      },
    });
  });
});
