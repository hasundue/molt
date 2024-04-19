import { assertExists } from "@std/assert";

import { createGraph } from "@deno/graph";
import { createGraphLocally } from "./graph.ts";

Deno.test("createGraph", async () => {
  const graph = await createGraph(
    "https://deno.land/x/std/testing/asserts.ts",
  );
  assertExists(graph);
});

Deno.test("createGraphLocally", async () => {
  const graph = await createGraphLocally([
    new URL("../test/cases/import.ts", import.meta.url).href,
  ]);
  assertExists(graph);
});
