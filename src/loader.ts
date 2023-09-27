import {
  type CreateGraphOptions,
  load as defaultLoad,
} from "../lib/x/deno_graph.ts";

export const load: NonNullable<CreateGraphOptions["load"]> = async (
  specifier,
) => {
  const url = new URL(specifier); // should not throw
  switch (url.protocol) {
    case "node:":
    case "npm:":
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
};
