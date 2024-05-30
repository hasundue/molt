import * as fs from "@chiezo/amber/fs";
import { assertArrayIncludes, assertObjectMatch } from "@std/assert";
import { EOL } from "@std/fs/eol";
import * as Jsonc from "@std/jsonc";
import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { write } from "./file.ts";
import { collect } from "./update.ts";
import { LatestVersionStub } from "../test/mock.ts";

describe("write", () => {
  let vstub: LatestVersionStub;

  beforeEach(() => {
    vstub = LatestVersionStub.create("123.456.789");
    fs.stub(new URL("../test/fixtures", import.meta.url));
    fs.mock();
  });

  afterEach(() => {
    fs.dispose();
    vstub.restore();
  });

  it("deno.jsonc", async () => {
    const source = new URL("../test/fixtures/deno.jsonc", import.meta.url);
    await write(await collect(source));
    assertObjectMatch(
      // deno-lint-ignore no-explicit-any
      Jsonc.parse(await Deno.readTextFile(source)) as any,
      {
        imports: {
          "@octokit/core": "npm:@octokit/core@123.456.789",
          "@std/assert": "jsr:@std/assert@123.456.789",
          "@std/bytes": "jsr:@std/bytes@123.456.789",
          "@std/jsonc": "jsr:@std/jsoc@0.222.x",
          "@std/testing": "jsr:@std/testing@^0.222.0",
          "@std/testing/bdd": "jsr:@std/testing@123.456.789/bdd",
          "@std/yaml": "jsr:@std/yaml@123.456.789",
          "lib/": "./lib/",
          "x/deno_graph": "https://deno.land/x/deno_graph@123.456.789/mod.ts",
          "std/": "https://deno.land/std@123.456.789/",
          "std/assert": "https://deno.land/std@123.456.789/assert/mod.ts",
        },
      },
    );
  });

  it("deps.ts", async () => {
    const source = new URL("../test/fixtures/deps.ts", import.meta.url);
    await write(await collect(source));
    const actual = await Deno.readTextFile(source);
    assertArrayIncludes(
      actual.split(EOL).filter((line) => line.startsWith("import")),
      [
        'import "npm:@octokit/core@123.456.789";',
        'import "jsr:@std/assert@123.456.789";',
        'import "jsr:@std/bytes@123.456.789";',
        'import "jsr:@std/jsonc@0.222.x";',
        'import "jsr:@std/testing@^0.222.0";',
        'import "jsr:@std/testing@123.456.789/bdd";',
        'import "jsr:@std/yaml@123.456.789";',
        'import "https://deno.land/x/deno_graph@123.456.789/mod.ts";',
        'import "https://deno.land/std@123.456.789/";',
        'import "https://deno.land/std@123.456.789/assert/mod.ts";',
      ],
    );
  });

  it("mod.ts", async () => {
    const source = new URL("../test/fixtures/mod.ts", import.meta.url);
    await write(await collect(source));
    const actual = await Deno.readTextFile(source);
    assertArrayIncludes(
      actual.split(EOL).filter((line) => line.startsWith("export")),
      [
        'export { createGraph } from "https://deno.land/x/deno_graph@123.456.789/mod.ts";',
      ],
    );
  });

  it("mod_test.ts", async () => {
    const source = new URL("../test/fixtures/mod_test.ts", import.meta.url);
    await write(
      await collect(source, { importMap: new URL("deno.jsonc", source) }),
    );
    assertArrayIncludes(
      (await Deno.readTextFile(source))
        .split(EOL).filter((line) => line.startsWith("import")),
      [
        'import { assertEquals } from "jsr:@std/assert@123.456.789";',
        'import { describe, it } from "@std/testing/bdd";',
        'import { createGraph } from "./mod.ts";',
      ],
    );
    assertArrayIncludes(
      (await Deno.readTextFile(new URL("mod.ts", source)))
        .split(EOL).filter((line) => line.startsWith("export")),
      [
        'export { createGraph } from "https://deno.land/x/deno_graph@123.456.789/mod.ts";',
      ],
    );
    assertObjectMatch(
      Jsonc.parse(
        await Deno.readTextFile(new URL("deno.jsonc", source)),
        // deno-lint-ignore no-explicit-any
      ) as any,
      {
        imports: {
          "@octokit/core": "npm:@octokit/core@6.1.0",
          "@std/assert": "jsr:@std/assert@0.222.0",
          "@std/bytes": "jsr:@std/bytes",
          "@std/jsonc": "jsr:@std/jsoc@0.222.x",
          "@std/testing": "jsr:@std/testing@^0.222.0",
          "@std/testing/bdd": "jsr:@std/testing@123.456.789/bdd",
          "@std/yaml": "jsr:@std/yaml@123.456.789",
          "lib/": "./lib/",
          "x/deno_graph": "https://deno.land/x/deno_graph@0.50.0/mod.ts",
          "std/": "https://deno.land/std@0.222.0/",
          "std/assert": "https://deno.land/std/assert/mod.ts",
        },
      },
    );
  });
});
