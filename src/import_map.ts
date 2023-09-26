import { maxBy } from "https://deno.land/std@0.202.0/collections/max_by.ts";
import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import {
  ImportMapJson,
  parseFromJson,
} from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import type {
  Brand,
  DependencySpecifier,
  FilePath,
  Maybe,
  ModuleSpecifier,
} from "./types.ts";
import { toFileSpecifier } from "./utils.ts";

export type ImportMapKey = Brand<string, "ImportMapKey">;

interface ImportMapResolveResult {
  /** The key in the import map that used to resolve a specifier. */
  key: ImportMapKey;
  /** The full specifier resolved from the import map. */
  specifier: DependencySpecifier;
}

export interface ImportMap {
  path: FilePath;
  imports: ImportMapJson["imports"];
  tryResolve(
    specifier: string,
    referrer: ModuleSpecifier,
  ): Maybe<ImportMapResolveResult>;
}

export async function readFromJson(path: FilePath): Promise<ImportMap> {
  // Instead of validate the json by ourself, let the import_map module do it.
  const inner = await parseFromJson(
    toFileSpecifier(path),
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
  const json = JSON.parse(inner.toJSON()) as ImportMapJson;
  return {
    path,
    imports: json.imports,
    tryResolve(specifier: string, referrer: ModuleSpecifier) {
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
      for (const key of Object.keys(json.imports)) {
        if (resolved.includes(key)) matched.push(key);
      }
      const used = maxBy(
        Object.keys(json.imports).filter((key) => resolved.includes(key)),
        (key) => key.length,
      );
      if (!used) {
        throw new Error(
          `Cannot find the key used for resolving ${specifier} from ${referrer}`,
        );
      }
      return {
        key: used as ImportMapKey,
        specifier: resolved as DependencySpecifier,
      };
    },
  };
}

export async function isImportMap(path: FilePath): Promise<boolean> {
  const content = await Deno.readTextFile(path);
  try {
    // The url doesn't matter here.
    await parseFromJson("file:///import_map.json", content);
    return true;
  } catch {
    return false;
  }
}
