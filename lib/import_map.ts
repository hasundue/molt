import { assertEquals } from "./std/assert.ts";
import { maxBy } from "./std/collections.ts";
import { parse } from "./std/jsonc.ts";
import { type ImportMapJson, parseFromJson } from "./x/import_map.ts";
import { is } from "./x/unknownutil.ts";

export type { ImportMapJson };

export interface ImportMapResolveResult {
  /** The fully-resolved URL string of the import specifier. */
  resolved: string;
  /** The key of the import map that matched with the import specifier. */
  key?: string;
  /** The mapped value by the import map corresponding to the key. */
  value?: string;
}

export interface ImportMap {
  /** The string URL of the import map. */
  path: string;
  /**
   * Resolve the given specifier using the import map.
   * @param specifier - The specifier to resolve.
   * @param referrer - The URL of the module that imports the specifier.
   * @return The result of the resolution or undefined if the specifier is not
   * resolved by the import map.
   */
  resolve(
    specifier: string,
    referrer: string | URL,
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
 * Read an import map from the given file path or URL.
 * @param path - The path to the import map.
 * @return The import map object if found.
 * @throws {SyntaxError} If the import map is not a valid JSON.
 */
export async function readFromJson(
  path: string | URL,
): Promise<ImportMap> {
  const data = await Deno.readTextFile(path);

  function parseJsonc(data: string) {
    try {
      return parse(data);
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new SyntaxError(`Invalid JSON or JSONC: ${path}`, { cause: e });
      }
      throw e;
    }
  }
  const json = parseJsonc(data);

  if (isImportMapReferrer(json)) {
    return readFromJson(new URL(json.importMap, path));
  }
  if (!isImportMapJson(json)) {
    throw new SyntaxError(`${path} is not a valid import map`);
  }
  const inner = await parseFromJson(path, json);

  return {
    path: path.toString(),
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
        resolved,
        ...replacement,
      };
    },
    resolveInner: inner.resolve.bind(inner),
  };
}
