import { relative } from "https://deno.land/std@0.202.0/path/mod.ts";

export type Brand<T, B> = T & { __brand: B };

export type Maybe<T> = T | undefined;

export function createUrl(specifier: string): Maybe<URL> {
  try {
    return new URL(specifier);
  } catch {
    return;
  }
}

export function relativeFromCwd(path: string) {
  return relative(Deno.cwd(), path);
}

export const log = {
  debug: Deno.env.get("CI") ? () => {} : globalThis.console.debug,
};
