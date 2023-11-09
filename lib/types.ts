export type Maybe<T> = T | undefined;
export type Brand<T, B> = T & { __brand: B };

/** A string that represents a path segment (e.g. `src/lib.ts`.) */
export type Path = Brand<string, "Path">;
