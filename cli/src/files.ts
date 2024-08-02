import { VERSION } from "@molt/core/locks";
import { exists } from "@std/fs";
import { parse } from "@std/jsonc";

export async function findConfig() {
  if (await exists("deno.json") && await hasImports("deno.json")) {
    return "deno.json";
  }
  if (await exists("deno.jsonc") && await hasImports("deno.jsonc")) {
    return "deno.jsonc";
  }
}

async function hasImports(config: string): Promise<boolean> {
  if (!config) return false;
  const jsonc = parse(await Deno.readTextFile(config));
  return jsonc !== null && typeof jsonc === "object" && "imports" in jsonc;
}

export async function findLock(path?: string) {
  path ??= await exists("deno.lock") ? "deno.lock" : undefined;
  if (!path) {
    return;
  }
  const { version } = JSON.parse(await Deno.readTextFile(path));
  if (version !== VERSION) {
    console.warn(
      `Unsupported lockfile version: '${version}'. Please update the lock file manually.`,
    );
    return;
  }
  return path;
}

export async function findSource() {
  const source: string[] = [];
  for await (const entry of Deno.readDir(".")) {
    if (entry.isFile && entry.name.endsWith(".ts")) {
      source.push(entry.name);
    }
  }
  return source;
}
