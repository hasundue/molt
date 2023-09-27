export type Maybe<T> = T | undefined;
export type Brand<T, B> = T & { __brand: B };

/** A string that represents a path segment (e.g. `src/lib.ts`.) */
export type Path = Brand<string, "Path">;

/** A string that represents a semver (e.g. `v1.0.0`.) */
export type SemVerString = Brand<string, "SemVerString">;

export const URISchemes = ["http", "https", "file", "npm", "node"] as const;
export type URISchemes = typeof URISchemes[number];
