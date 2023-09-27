import { maxBy } from "../lib/std/collections.ts";
import { parse as parseJsonc } from "../lib/std/jsonc.ts";
import { type ImportMapJson, parseFromJson } from "../lib/x/import_map.ts";
import type { Maybe } from "../lib/types.ts";
import { URI } from "../lib/uri.ts";
import { URIScheme } from "./types.ts";

export type { ImportMapJson };

export interface ImportMapResolveResult {
  /** The full specifier resolved from the import map. */
  specifier: URI<URIScheme>;
  from?: string;
  to?: string;
}

export interface ImportMap {
  specifier: URI<"file">;
  resolve(specifier: string, referrer: string): Maybe<ImportMapResolveResult>;
  resolveSimple(specifier: string, referrer: string): string;
}

export const ImportMap = {
  readFromJson,
};

async function readFromJson(path: string): Promise<Maybe<ImportMap>> {
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
    resolve(specifier, referrer) {
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
        specifier: URI.ensure(...URIScheme.values)(resolved),
        ...replacement,
      };
    },
    resolveSimple: inner.resolve.bind(inner),
  };
}
