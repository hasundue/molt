export type Maybe<T> = T | undefined;
export type Brand<T, B> = T & { __brand: B };

/** A string that represents a path segment (e.g. `src/lib.ts`.) */
export type Path = Brand<string, "Path">;

export type Uri = Url | FileUri;

/** A string of a URL (e.g. `https://deno.land/x/deno_graph/mod.ts`.) */
export type Url = Brand<string, "Url">;

/** A string of a file URI (e.g. `file:///usr/local/bin/deno`.) */
export type FileUri = Brand<string, "FileUri">;

/** A string that represents a semver (e.g. `v1.0.0`.) */
export type SemVerString = Brand<string, "SemVerString">;
