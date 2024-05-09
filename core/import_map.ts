import { assertEquals } from "@std/assert";
import { maxBy } from "@std/collections";
import { parse as parseJsonc } from "@std/jsonc";
import { ensure, is } from "@core/unknownutil";
import { toPath } from "@molt/lib/path";
import { type ImportMapJson, parseFromJson } from "./import_map/js/mod.ts";
import { parse, stringify } from "./dependency.ts";

export type { ImportMapJson };

export interface ImportMapResolveResult<HasKey extends boolean = boolean> {
  /** The fully-resolved URL string of the import specifier. */
  resolved: string;
  /** The key of the import map that matched with the import specifier. */
  key: HasKey extends true ? string : undefined;
  /** The mapped value by the import map corresponding to the key. */
  value: HasKey extends true ? string : undefined;
}

export interface ImportMap {
  /** The full path to the source of the import map.
   * @example "/path/to/import_map.json" */
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
 * Read and parse a JSON including import maps from the given file path or URL.
 */
export async function readImportMapJson(
  url: string | URL,
): Promise<ImportMapJson> {
  const data = await Deno.readTextFile(url);
  try {
    return parseImportMapJson(data);
  } catch {
    throw new SyntaxError(`${url} does not have a valid import map`);
  }
}

/**
 * Parse a JSON including import maps from the given string.
 */
export function parseImportMapJson(
  data: string,
): ImportMapJson {
  return ensure(parseJsonc(data), isImportMapJson);
}

/**
 * Read an import map from the given file path or URL.
 * @param url - The URL of the import map.
 * @return The import map object if found.
 * @throws {SyntaxError} If the file does not have a valid import map.
 */
export async function readFromJson(
  url: string | URL,
): Promise<ImportMap> {
  url = new URL(url);
  const data = await Deno.readTextFile(url);
  const json = parseJsonc(data);

  if (isImportMapReferrer(json)) {
    return readFromJson(new URL(json.importMap, url));
  }
  if (!isImportMapJson(json)) {
    throw new SyntaxError(`${url} does not have a valid import map`);
  }
  const inner = await parseFromJson(url, json);

  return {
    path: toPath(url),
    resolve(specifier, referrer) {
      const resolved = inner.resolve(specifier, referrer);
      // Return if the specifier is not resolved by the import map.
      if (resolved === specifier) {
        return;
      }
      const url = new URL(resolved);
      // Find which key is used for the resolution. This is ridiculously
      // inefficient, but we prefer not to reimplement the whole
      // import_map module.
      // TODO: migrate to our own import_map wasm
      const replacement = maxBy(
        Object.entries(json.imports)
          .filter(([, value]) =>
            resolved.includes(
              // We need this because import_map adds a heading slash to the
              // dependency when a jsr import has a path.
              // e.g. jsr:/@std/testing@0.210.0/
              value.startsWith("jsr:")
                ? stringify(parse(value), { protocol: false, path: true })
                : value,
            )
          )
          .map(([key, value]) => ({ key, value })),
        ({ value }) => value.length,
      );
      if (!replacement) {
        // The specifier should be a relative file path
        assertEquals(url.protocol, "file:");
      }
      return {
        resolved,
        key: replacement?.key,
        value: replacement?.value,
      };
    },
    resolveInner: inner.resolve.bind(inner),
  };
}

export async function tryReadFromJson(
  url: string | URL,
): Promise<ImportMap | undefined> {
  try {
    return await readFromJson(url);
  } catch {
    return;
  }
}
