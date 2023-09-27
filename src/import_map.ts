import { maxBy } from "https://deno.land/std@0.202.0/collections/max_by.ts";
import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import {
  ImportMapJson,
  parseFromJson,
} from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import type { Maybe } from "./types.ts";
import { URI } from "./uri.ts";
import { catchMe as _try } from "./utils.ts";

interface ImportMapResolveResult {
  /** The full specifier resolved from the import map. */
  specifier: URI<"http" | "https" | "file" | "npm">;
  /** The string that replaced the matched part of the specifier. */
  replacement: string;
}

export interface ImportMap {
  path: string;
  imports: ImportMapJson["imports"];
  tryResolve(
    specifier: string,
    referrer: URI<"http" | "https" | "file">,
  ): Maybe<ImportMapResolveResult>;
}

export async function readFromJson(path: string): Promise<ImportMap> {
  // Instead of validate the json by ourself, let the import_map module do it.
  const inner = await parseFromJson(
    URI.from(path),
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
  const json = JSON.parse(inner.toJSON()) as ImportMapJson;
  return {
    tryResolve(specifier, referrer) {
      const resolved = _try(inner.resolve)(specifier, referrer)
        .catchWith(undefined);
      if (!resolved) {
        // The specifier is not in the import map.
        return undefined;
      }
      // Find which key is used for the resolution. The process here is ridiculously
      // inefficient, but we prefer not to reimplement the whole import_map module.
      const replacement = maxBy(
        Object.values(json.imports).filter((str) => resolved.includes(str)),
        (str) => str.length,
      );
      if (!replacement) {
        throw new Error(`Cannot find a mapping for ${resolved} in ${path}`);
      }
      return {
        specifier: URI.ensure("http", "https", "file")(resolved),
        replacement,
      };
    },
    path,
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
