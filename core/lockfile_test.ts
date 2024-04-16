import {
  collectUpdateFromLockFile,
  createLockPart,
  createLockPartForEach,
  parseLockFileJson,
  readLockFile,
} from "./lockfile.ts";
import { assertEquals, assertObjectMatch } from "@std/assert";

Deno.test("parseLockFileJson", async () =>
  assertObjectMatch(
    parseLockFileJson(
      await Deno.readTextFile(
        new URL("../test/cases/lockfile/deno.updated.lock", import.meta.url),
      ),
    ),
    {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.9",
          "npm:hono@^3": "npm:hono@3.12.12",
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
      },
    },
  ));

Deno.test("createLockPart - jsr:@core/match", async () => {
  const lock = await createLockPart("jsr:@core/match@0.1.x");
  assertObjectMatch(
    lock.data,
    {
      packages: {
        specifiers: {
          "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.9",
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
      },
    },
  );
});

Deno.test("createLockPart - npm:hono", async () => {
  const lock = await createLockPart("npm:hono@^3");
  assertObjectMatch(
    lock.data,
    {
      packages: {
        specifiers: {
          "npm:hono@^3": "npm:hono@3.12.12",
        },
      },
    },
  );
});

Deno.test("createLockPartForEach", async () => {
  const updated = await createLockPartForEach(
    await readLockFile(
      new URL("../test/cases/lockfile/deno.lock", import.meta.url),
    ),
  );
  assertEquals(updated.length, 3);
  assertObjectMatch(
    updated[0].data,
    {
      packages: {
        specifiers: {
          "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.9",
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
      },
    },
  );
  assertObjectMatch(
    updated[1].data,
    {
      packages: {
        specifiers: {
          "npm:hono@^3": "npm:hono@3.12.12",
        },
      },
    },
  );
  assertObjectMatch(
    updated[2].data,
    {
      packages: {
        specifiers: {
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
      },
    },
  );
});

Deno.test("createLockPartForEach - no updates", async () => {
  const updated = await createLockPartForEach(
    await readLockFile(
      new URL("../test/cases/lockfile/deno.lock", import.meta.url),
    ),
    false,
  );
  assertEquals(updated.length, 3);
  assertObjectMatch(
    updated[0].data,
    {
      version: "3",
      packages: {
        specifiers: {
          "jsr:@core/match@0.1.0": "jsr:@core/match@0.1.0",
          "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0",
        },
        jsr: { "@core/match@0.1.0": {/* won't check */} },
        npm: { "ts-toolbelt@9.6.0": {/* won't check */} },
      },
    },
  );
  assertObjectMatch(
    updated[1].data,
    {
      version: "3",
      packages: {
        specifiers: { "npm:hono@3.0.0": "npm:hono@3.0.0" },
        npm: { "hono@3.0.0": {/* won't check */} },
      },
      remote: {},
    },
  );
  assertObjectMatch(
    updated[2].data,
    {
      version: "3",
      packages: {
        specifiers: { "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0" },
        npm: {
          "ts-toolbelt@9.6.0": {/* won't check */},
        },
      },
      remote: {},
    },
  );
});

Deno.test("collectUpdateFromLockFile", async () => {
  const updates = await collectUpdateFromLockFile(
    await readLockFile(
      new URL("../test/cases/lockfile/deno.lock", import.meta.url),
    ),
  );
  assertEquals(updates.length, 2);
  assertObjectMatch(
    updates[0],
    {
      from: {
        protocol: "jsr:",
        name: "@core/match",
        version: "0.1.0",
        path: "",
      },
      to: {
        protocol: "jsr:",
        name: "@core/match",
        version: "0.1.9",
        path: "",
      },
      code: { specifier: "jsr:@core/match@0.1.x", span: undefined },
      map: undefined,
    },
  );
  assertObjectMatch(
    updates[1],
    {
      from: {
        protocol: "npm:",
        name: "hono",
        version: "3.0.0",
        path: "",
      },
      to: {
        protocol: "npm:",
        name: "hono",
        version: "3.12.12",
        path: "",
      },
      code: { specifier: "npm:hono@^3", span: undefined },
      map: undefined,
    },
  );
});

Deno.test("collectUpdateFromLockFile - with a patch", async () => {
  const updates = await collectUpdateFromLockFile(
    await readLockFile(
      new URL("../test/cases/lockfile/deno.lock", import.meta.url),
    ),
    await createLockPart("npm:hono@^3"),
  );
  assertEquals(updates.length, 1);
  assertObjectMatch(
    updates[0],
    {
      from: {
        protocol: "npm:",
        name: "hono",
        version: "3.0.0",
        path: "",
      },
      to: {
        protocol: "npm:",
        name: "hono",
        version: "3.12.12",
        path: "",
      },
      code: { specifier: "npm:hono@^3", span: undefined },
      map: undefined,
    },
  );
});
