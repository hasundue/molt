import {
  assert,
  assertEquals,
  assertExists,
  assertObjectMatch,
} from "@std/assert";
import { collect } from "./update.ts";
import { LatestVersionStub } from "../test/mock.ts";

Deno.test("collect - deno.jsonc", async () => {
  using _stub = LatestVersionStub.create("123.456.789");

  const result = await collect(
    new URL("../test/fixtures/deno.jsonc", import.meta.url),
  );
  assertEquals(result.updates.length, 7);

  const assertNextUpdate = (
    // deno-lint-ignore no-explicit-any
    expected: any,
  ) => {
    const actual = result.updates.shift();
    assertExists(actual);
    assertObjectMatch(actual, expected);
    assertExists(actual.map?.source);
    assert(actual.map?.source.endsWith("deno.jsonc"));
    assert(actual.referrer.endsWith("deno.jsonc"));
  };

  // npm
  assertNextUpdate({
    from: {
      protocol: "npm:",
      name: "@octokit/core",
      version: "6.1.0",
      path: "",
    },
    to: {
      protocol: "npm:",
      name: "@octokit/core",
      version: "123.456.789",
      path: "",
    },
    code: { specifier: "npm:@octokit/core@6.1.0", span: undefined },
    map: {
      resolved: "npm:@octokit/core@6.1.0",
      key: "@octokit/core",
      value: "npm:@octokit/core@123.456.789",
    },
  });

  // jsr - exact
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/assert",
      version: "0.222.0",
      path: "",
    },
    to: {
      protocol: "jsr:",
      name: "@std/assert",
      version: "123.456.789",
      path: "",
    },
    code: { specifier: "jsr:@std/assert@0.222.0", span: undefined },
    map: {
      resolved: "jsr:@std/assert@0.222.0",
      key: "@std/assert",
      value: "jsr:@std/assert@123.456.789",
    },
  });

  // jsr - unversioned
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/bytes",
      path: "",
      version: undefined,
    },
    to: {
      protocol: "jsr:",
      name: "@std/bytes",
      path: "",
      version: "123.456.789",
    },
    code: { specifier: "jsr:@std/bytes", span: undefined },
    map: {
      resolved: "jsr:@std/bytes",
      key: "@std/bytes",
      value: "jsr:@std/bytes@123.456.789",
    },
  });

  // jsr - specific
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/testing",
      version: "0.222.0",
      path: "/bdd",
    },
    to: {
      protocol: "jsr:",
      name: "@std/testing",
      version: "123.456.789",
      path: "/bdd",
    },
    code: { specifier: "jsr:@std/testing@0.222.0/bdd", span: undefined },
    map: {
      resolved: "jsr:@std/testing@0.222.0/bdd",
      key: "@std/testing/bdd",
      value: "jsr:@std/testing@123.456.789/bdd",
    },
  });

  // http - prefix
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/std",
      version: "0.222.0",
      path: "/",
    },
    to: {
      protocol: "https:",
      name: "deno.land/std",
      version: "123.456.789",
      path: "/",
    },
    code: { specifier: "https://deno.land/std@0.222.0/", span: undefined },
    map: {
      resolved: "https://deno.land/std@0.222.0/",
      key: "std/",
      value: "https://deno.land/std@123.456.789/",
    },
  });

  // http - unversioned
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/std",
      version: undefined,
      path: "/assert/mod.ts",
    },
    to: {
      protocol: "https:",
      name: "deno.land/std",
      version: "123.456.789",
      path: "/assert/mod.ts",
    },
    code: {
      specifier: "https://deno.land/std/assert/mod.ts",
      span: undefined,
    },
    map: {
      resolved: "https://deno.land/std/assert/mod.ts",
      key: "std/assert",
      value: "https://deno.land/std@123.456.789/assert/mod.ts",
    },
  });

  // http
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "0.50.0",
      path: "/mod.ts",
    },
    to: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "123.456.789",
      path: "/mod.ts",
    },
    code: {
      specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      span: undefined,
    },
    map: {
      resolved: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      key: "x/deno_graph",
      value: "https://deno.land/x/deno_graph@123.456.789/mod.ts",
    },
  });
});

Deno.test("collect - deps.ts", async () => {
  using _stub = LatestVersionStub.create({ _: "123.456.789" });

  const result = await collect(
    new URL("../test/fixtures/deps.ts", import.meta.url),
  );
  assertEquals(result.updates.length, 7);

  const assertNextUpdate = (
    // deno-lint-ignore no-explicit-any
    expected: any,
  ) => {
    const actual = result.updates.shift();
    assertExists(actual);
    assertObjectMatch(actual, expected);
    assertEquals(actual.map, undefined);
    assert(actual.referrer.endsWith("deps.ts"));
  };

  // npm
  assertNextUpdate({
    from: {
      protocol: "npm:",
      name: "@octokit/core",
      version: "6.1.0",
      path: "",
    },
    to: {
      protocol: "npm:",
      name: "@octokit/core",
      version: "123.456.789",
      path: "",
    },
    code: {
      specifier: "npm:@octokit/core@6.1.0",
      span: {
        start: { line: 1, character: 7 },
        end: { line: 1, character: 32 },
      },
    },
  });

  // jsr - exact
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/assert",
      version: "0.222.0",
      path: "",
    },
    to: {
      protocol: "jsr:",
      name: "@std/assert",
      version: "123.456.789",
      path: "",
    },
    code: {
      specifier: "jsr:@std/assert@0.222.0",
      span: {
        start: { line: 4, character: 7 },
        end: { line: 4, character: 32 },
      },
    },
  });

  // jsr - unversioned
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/bytes",
      path: "",
    },
    to: {
      protocol: "jsr:",
      name: "@std/bytes",
      path: "",
      version: "123.456.789",
    },
    code: {
      specifier: "jsr:@std/bytes",
      span: {
        start: { line: 7, character: 7 },
        end: { line: 7, character: 23 },
      },
    },
  });

  // jsr - specific
  assertNextUpdate({
    from: {
      protocol: "jsr:",
      name: "@std/testing",
      version: "0.222.0",
      path: "/bdd",
    },
    to: {
      protocol: "jsr:",
      name: "@std/testing",
      version: "123.456.789",
      path: "/bdd",
    },
    code: {
      specifier: "jsr:@std/testing@0.222.0/bdd",
      span: {
        start: { line: 16, character: 7 },
        end: { line: 16, character: 37 },
      },
    },
  });

  // http - prefix
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/std",
      version: "0.222.0",
      path: "/",
    },
    to: {
      protocol: "https:",
      name: "deno.land/std",
      version: "123.456.789",
      path: "/",
    },
    code: {
      specifier: "https://deno.land/std@0.222.0/",
      span: {
        start: { line: 25, character: 7 },
        end: { line: 25, character: 39 },
      },
    },
  });

  // http - unversioned
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/std",
      path: "/assert/mod.ts",
    },
    to: {
      protocol: "https:",
      name: "deno.land/std",
      version: "123.456.789",
      path: "/assert/mod.ts",
    },
    code: {
      specifier: "https://deno.land/std/assert/mod.ts",
      span: {
        start: { line: 28, character: 7 },
        end: { line: 28, character: 44 },
      },
    },
  });

  // http
  assertNextUpdate({
    from: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "0.50.0",
      path: "/mod.ts",
    },
    to: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "123.456.789",
      path: "/mod.ts",
    },
    code: {
      specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      span: {
        start: { line: 22, character: 7 },
        end: { line: 22, character: 53 },
      },
    },
  });
});

Deno.test("collect - mod.ts", async () => {
  using _stub = LatestVersionStub.create({ _: "123.456.789" });
  const result = await collect(
    new URL("../test/fixtures/mod.ts", import.meta.url),
  );
  assertEquals(result.updates.length, 1);
  const update = result.updates[0];
  // http export
  assertObjectMatch(update, {
    from: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "0.50.0",
      path: "/mod.ts",
    },
    to: {
      protocol: "https:",
      name: "deno.land/x/deno_graph",
      version: "123.456.789",
      path: "/mod.ts",
    },
    code: {
      specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
    },
    map: undefined,
  });
  assert(update.referrer.endsWith("mod.ts"));
});

Deno.test("collect - mod_test.ts", async () => {
  using _stub = LatestVersionStub.create({ _: "123.456.789" });
  const result = await collect(
    new URL("../test/fixtures/mod_test.ts", import.meta.url),
    {
      importMap: new URL("../test/fixtures/deno.jsonc", import.meta.url),
      resolveLocal: true,
    },
  );
  assertEquals(result.updates.length, 3);

  const assertNextUpdate = (
    // deno-lint-ignore no-explicit-any
    expected: any,
    referrer: string,
    source?: string,
  ) => {
    const actual = result.updates.shift();
    assertExists(actual);
    assertObjectMatch(actual, expected);
    if (expected.map) {
      assertExists(source);
      assertExists(actual.map?.source);
      assert(actual.map?.source.endsWith(source));
    }
    assert(actual.referrer.endsWith(referrer));
  };

  assertNextUpdate(
    {
      from: {
        protocol: "jsr:",
        name: "@std/assert",
        version: "0.222.0",
        path: "",
      },
      to: {
        protocol: "jsr:",
        name: "@std/assert",
        version: "123.456.789",
        path: "",
      },
      code: {
        specifier: "jsr:@std/assert@0.222.0",
      },
    },
    "mod_test.ts",
  );

  assertNextUpdate(
    {
      from: {
        protocol: "jsr:",
        name: "@std/testing",
        version: "0.222.0",
        path: "/bdd",
      },
      to: {
        protocol: "jsr:",
        name: "@std/testing",
        version: "123.456.789",
        path: "/bdd",
      },
      code: {
        specifier: "@std/testing/bdd",
      },
      map: {
        resolved: "jsr:@std/testing@0.222.0/bdd",
        key: "@std/testing/bdd",
        value: "jsr:@std/testing@0.222.0/bdd",
      },
    },
    "mod_test.ts",
    "deno.jsonc",
  );

  assertNextUpdate(
    {
      from: {
        protocol: "https:",
        name: "deno.land/x/deno_graph",
        version: "0.50.0",
        path: "/mod.ts",
      },
      to: {
        protocol: "https:",
        name: "deno.land/x/deno_graph",
        version: "123.456.789",
        path: "/mod.ts",
      },
      code: {
        specifier: "https://deno.land/x/deno_graph@0.50.0/mod.ts",
      },
    },
    "mod.ts",
  );
});
