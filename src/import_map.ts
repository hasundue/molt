import { maxBy } from "https://deno.land/std@0.202.0/collections/max_by.ts";
import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import {
  ImportMapJson,
  parseFromJson,
} from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import type { Maybe, Path, Uri } from "./types.ts";
import { assertFileUri, ensureUri, toFileUri } from "./utils.ts";

interface ImportMapResolveResult {
  /** The key in the import map that used to resolve a specifier.
   * Undefined when the resolved specifier is a file URI. */
  key?: string;
  /** The full specifier resolved from the import map. */
  specifier: Uri;
}

export interface ImportMap {
  path: Path;
  imports: ImportMapJson["imports"];
  tryResolve(
    specifier: string,
    referrer: Uri,
  ): Maybe<ImportMapResolveResult>;
}

export async function readFromJson(path: Path): Promise<ImportMap> {
  // Instead of validate the json by ourself, let the import_map module do it.
  const inner = await parseFromJson(
    toFileUri(path),
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
  const json = JSON.parse(inner.toJSON()) as ImportMapJson;
  return {
    path,
    imports: json.imports,
    tryResolve(specifier: string, referrer: Uri) {
      let resolved: string;
      try {
        resolved = inner.resolve.bind(inner)(specifier, referrer);
      } catch {
        return undefined;
      }
      // Find which key is used for the resolution.
      // The process here is ridiculously inefficient, but we prefer not to reimplement
      // the whole import_map module.
      const matched: string[] = [];
      for (const [key, value] of Object.entries(json.imports)) {
        if (resolved.includes(value)) matched.push(key);
      }
      const used = maxBy(matched, (key) => key.length);
      if (!used) {
        assertFileUri(resolved);
        return {
          key: undefined,
          specifier: resolved,
        };
      }
      return {
        key: used,
        specifier: ensureUri(resolved),
      };
    },
  };
}

export async function isImportMap(path: Path): Promise<boolean> {
  const content = await Deno.readTextFile(path);
  try {
    // The url doesn't matter here.
    await parseFromJson("file:///import_map.json", content);
    return true;
  } catch {
    return false;
  }
}
