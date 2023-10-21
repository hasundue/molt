// deno-lint-ignore-file no-explicit-any

import { describe, it } from "./std/testing.ts";
import { assertEquals, assertThrows } from "./std/assert.ts";
import { createVersionProp } from "./versions.ts";

describe("createVersionProps()", () => {
  it("single version", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
      ] as any),
      {
        from: "0.0.1",
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with different names", () => {
    assertEquals(
      createVersionProp([{
        name: "deno_graph",
        version: { from: "0.0.1", to: "0.1.0" },
      }, {
        name: "node-emoji",
        version: { from: "0.0.1", to: "0.1.0" },
      }] as any),
      undefined,
    );
  });
  it("multiple versions with different `from`s and a common `to`", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.2", to: "0.1.0" },
        },
      ] as any),
      {
        from: undefined,
        to: "0.1.0",
      },
    );
  });
  it("multiple versions with a common `from` and `to`", () => {
    assertEquals(
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
      ] as any),
      {
        from: "0.0.1",
        to: "0.2.0",
      },
    );
  });
  it("multiple versions with a common `from` and different `to`s", () => {
    assertThrows(() =>
      createVersionProp([
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.1.0" },
        },
        {
          name: "deno_graph",
          version: { from: "0.0.1", to: "0.2.0" },
        },
      ] as any)
    );
  });
});
