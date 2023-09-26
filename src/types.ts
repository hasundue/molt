export type Maybe<T> = T | undefined;
export type Brand<T, B> = T & { __brand: B };

/** A string that represents a general path. */
export type Path = FilePath | UrlString;
/** A string that represents a file path. */
export type FilePath = RelativePath | AbsolutePath;
/** A relative path from the current working directory (e.g. `./src/mod.ts`.) */
export type RelativePath = Brand<string, "RelativePath">;
/** An absolute path (e.g. `/usr/local/bin/deno`.) */
export type AbsolutePath = Brand<string, "AbsolutePath">;
/** A string of a URL (e.g. `https://deno.land/x/deno_graph/mod.ts`.) */
export type UrlString = Brand<string, "UrlString">;

export type DependencySpecifier = Brand<string, "DependencySpecifier">;
export type ResolvedDependencySpecifier = Brand<
  DependencySpecifier,
  "ResolvedDependencySpecifier"
>;
export type ModuleSpecifier = FileSpecifier | UrlSpecifier;
export type FileSpecifier = Brand<string, "FileSpecifier">;
export type UrlSpecifier = Brand<string, "UrlSpecifier">;

export type SemVerString = Brand<string, "SemVerString">;
