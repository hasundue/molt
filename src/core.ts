import { type CreateGraphOptions } from "../lib/x/deno_graph.ts";
import { URI } from "../lib/uri.ts";
import type { Path } from "./types.ts";
import { ImportMap } from "./import_map.ts";

export async function createResolve(
  options?: {
    importMap?: string | Path;
  },
): Promise<CreateGraphOptions["resolve"]> {
  if (!options?.importMap) {
    return undefined;
  }
  const importMap = await readFromJson(options.importMap);
  if (!importMap) {
    return undefined;
  }
  return (specifier, referrer) => {
    return importMap.tryResolve(
      specifier,
      URI.ensure("file")(referrer),
    )?.specifier ?? specifier;
  };
}
