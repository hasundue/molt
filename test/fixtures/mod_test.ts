// jsr - exact version
import { assertEquals } from "jsr:@std/assert@0.222.0";

// jsr - specific, mapped
import { describe, it } from "@std/testing/bdd";

// local
import { createGraph } from "./mod.ts";

describe("createGraph", () => {
  it("should be a function", () => {
    assertEquals(typeof createGraph, "function");
  });
});
