import { maxBy } from "https://deno.land/std@0.202.0/collections/max_by.ts";
import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import {
  type ImportMapJson,
  parseFromJson,
} from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import { type Maybe, URISchemes } from "./types.ts";
import { URI } from "./uri.ts";

export { type ImportMapJson } from "https://deno.land/x/import_map@v0.15.0/mod.ts";

interface ImportMapResolveResult {
  /** The full specifier resolved from the import map. */
  source: URI<URISchemes>;
  from?: string;
  /** The string that replaced the matched part of the specifier.
   * Undefined if the specifier is a file path. */
  to?: string;
}

export interface ImportMap {
  specifier: URI<"file">;
  imports: ImportMapJson["imports"];
  tryResolve(
    specifier: string,
    referrer: URI<"http" | "https" | "file">,
  ): Maybe<ImportMapResolveResult>;
}

export async function readFromJson(path: string): Promise<ImportMap> {
  const specifier = URI.from(path);
  // Instead of validate the json by ourself, let the import_map module do it.
  const inner = await parseFromJson(
    specifier,
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
  const json = JSON.parse(inner.toJSON()) as ImportMapJson;
  return {
    tryResolve(specifier, referrer) {
      let resolved: string;
      try {
        resolved = inner.resolve(specifier, referrer);
      } catch {
        // The specifier is not in the import map.
        return undefined;
      }
      // Find which key is used for the resolution. This is ridiculously inefficient,
      // but we prefer not to reimplement the whole import_map module.
      const replacement = maxBy(
        Object.entries(json.imports)
          .map(([from, to]) => ({ from, to }))
          .filter(({ to }) => resolved.includes(to)),
        ({ to }) => to.length,
      );
      if (!replacement) {
        // The specifier is a file path
        URI.ensure("file")(resolved);
      }
      return {
        source: URI.ensure(...URISchemes)(resolved),
        ...replacement,
      };
    },
    specifier,
    imports: json.imports,
  };
}

export async function isImportMap(path: string): Promise<boolean> {
  const content = await Deno.readTextFile(path);
  try {
    // The url doesn't matter here.
    await parseFromJson("file:///import_map.json", content);
    return true;
  } catch {
    return false;
  }
}
