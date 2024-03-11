import {
  createGraph,
  CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
} from "./x/deno_graph.ts";

class DenoGraph {
  static #initialized = false;

  static async ensureInit() {
    if (this.#initialized) {
      return;
    }
    await initDenoGraph();
    this.#initialized = true;
  }
}

export async function createGraphLocally(
  specifiers: string[],
  options?: CreateGraphOptions,
) {
  await DenoGraph.ensureInit();
  return createGraph(specifiers, {
    load: async (specifier) => {
      const url = new URL(specifier); // should not throw
      switch (url.protocol) {
        case "node:":
        case "npm:":
        case "jsr:":
          return {
            kind: "external",
            specifier,
          };
        case "http:":
        case "https:":
          return {
            kind: "external",
            specifier,
          };
        case "file:":
          return await defaultLoad(specifier);
        default:
          throw new Error(`Unsupported protocol: ${url.protocol}`);
      }
    },
    ...options,
  });
}
