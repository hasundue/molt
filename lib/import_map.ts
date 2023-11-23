import { assertEquals } from "./std/assert.ts";
import { maxBy } from "./std/collections.ts";
import { parse } from "./std/jsonc.ts";
import { type ImportMapJson, parseFromJson } from "./x/import_map.ts";
import { is } from "./x/unknownutil.ts";

export type { ImportMapJson };

export interface ImportMapResolveResult {
  /** The fully-resolved URL of the dependency. */
  url: URL;
  /** The key of the import map that matched with the import specifier. */
  key?: string;
  /** The value of the import map for the key. */
  value?: string;
}

export interface ImportMap {
  url: URL;
  resolve(
    specifier: string,
    referrer: URL,
  ): ImportMapResolveResult | undefined;
  /**
   * The original `ImportMap.resolve` from the `import_map` module.
   */
  resolveInner(specifier: string, referrer: string | URL): string;
}

const isImportMapJson = is.ObjectOf({
  imports: is.RecordOf(is.String),
});

const isImportMapReferrer = is.ObjectOf({
  importMap: is.String,
});

/**
 * Read an import map from the given URL.
 * @param url - The URL of the import map.
 * @return The import map object if found.
 */
export async function readFromJson(
  url: URL,
): Promise<ImportMap | undefined> {
  const data = await Deno.readTextFile(url);
  if (data.length === 0) {
    return;
  }
  const json = parse(data);
  if (isImportMapReferrer(json)) {
    return readFromJson(new URL(json.importMap, url));
  }
  if (!isImportMapJson(json)) {
    return;
  }
  const inner = await parseFromJson(url, json);
  return {
    url,
    resolve(specifier, referrer) {
      const resolved = inner.resolve(specifier, referrer);
      // Return if the specifier is not resolved by the import map.
      if (resolved === specifier) {
        return;
      }
      const url = new URL(resolved);
      // Find which key is used for the resolution.
      // This is ridiculously inefficient, but we prefer not to reimplement
      // the whole import_map module. Maybe we should rather contribute to
      // the original import_map module.
      const replacement = maxBy(
        Object.entries(json.imports)
          .filter(([, value]) => resolved.includes(value))
          .map(([key, value]) => ({ key, value })),
        ({ value }) => value.length,
      );
      if (!replacement) {
        // The specifier should be a relative file path
        assertEquals(url.protocol, "file:");
      }
      return {
        url,
        ...replacement,
      };
    },
    resolveInner: inner.resolve.bind(inner),
  };
}
