import { maxBy } from "https://deno.land/std@0.202.0/collections/max_by.ts";
import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import {
  type ImportMapJson,
  parseFromJson,
} from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import { type Maybe, URISchemes } from "./types.ts";
import { URI } from "./uri.ts";

export { type ImportMapJson } from "https://deno.land/x/import_map@v0.15.0/mod.ts";

export interface ImportMapResolveResult {
  /** The full specifier resolved from the import map. */
  specifier: URI<URISchemes>;
  from?: string;
  to?: string;
}

export interface ImportMap {
  specifier: URI<"file">;
  tryResolve(
    specifier: string,
    referrer: URI<"file">,
  ): Maybe<ImportMapResolveResult>;
}

export async function readFromJson(path: string): Promise<Maybe<ImportMap>> {
  const specifier = URI.from(path);
  // Instead of validate the json by ourself, let the import_map module do it.
  const inner = await parseFromJson(
    specifier,
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
  const json = JSON.parse(inner.toJSON()) as ImportMapJson;
  if (!json.imports) {
    // The import map is empty
    return undefined;
  }
  return {
    specifier,
    tryResolve(specifier, referrer) {
      const resolved = inner.resolve(specifier, referrer);
      // Find which key is used for the resolution. This is ridiculously inefficient,
      // but we prefer not to reimplement the whole import_map module.
      const replacement = maxBy(
        Object.entries(json.imports)
          .map(([from, to]) => ({ from, to }))
          .filter(({ to }) => resolved.includes(to)),
        ({ to }) => to.length,
      );
      if (!replacement) {
        // The specifier should be a file path
        URI.ensure("file")(resolved);
      }
      return {
        specifier: URI.ensure(...URISchemes)(resolved),
        ...replacement,
      };
    },
  };
}
