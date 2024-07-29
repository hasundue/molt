import * as Jsonc from "@std/jsonc";
import { ensure, is } from "@core/unknownutil";

export interface ImportMapJson {
  imports?: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
}

/**
 * Parse an import map from the given JSON string.
 */
export function parseImportMapJson(
  src: string,
): ImportMapJson {
  return ensure(
    Jsonc.parse(src),
    is.ObjectOf({
      imports: is.OptionalOf(is.RecordOf(is.String)),
      scopes: is.OptionalOf(is.RecordOf(is.RecordOf(is.String))),
    }),
  );
}

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
    throw new SyntaxError(`${url} is not a valid import map`);
  }
}
