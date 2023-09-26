import { parse as parseJsonc } from "https://deno.land/std@0.202.0/jsonc/mod.ts";
import { parseFromJson } from "https://deno.land/x/import_map@v0.15.0/mod.ts";
import { toFileSpecifier } from "./utils.ts";

export function readFromJson(path: string) {
  // Instead of validate the json by ourself, let the import_map module do it.
  return parseFromJson(
    toFileSpecifier(path),
    // deno-lint-ignore no-explicit-any
    parseJsonc(Deno.readTextFileSync(path)) as any,
  );
}
