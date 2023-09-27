export interface CatchMe<R> {
  catch: <S>(you: (exception: unknown) => S) => R | S;
  catchWith: <S>(yours: S) => R | S;
}

export function isCatchMe<R>(
  arg: unknown,
): arg is CatchMe<R> {
  return typeof arg === "object" &&
    arg !== null &&
    "catch" in arg &&
    "catchWith" in arg;
}

export function catchMe<R>(me: () => R): CatchMe<R> {
  return {
    catch: <S>(you: (exception: unknown) => S) => {
      try {
        return me();
      } catch (e) {
        return you(e);
      }
    },
    catchWith: <S>(yours: S) => {
      try {
        return me();
      } catch {
        return yours;
      }
    },
  };
}

// deno-lint-ignore no-explicit-any
export function sayCatchMe<T extends any[], R>(
  me: (...args: T) => R,
): (...args: T) => CatchMe<R> {
  return (...args: T) => {
    return {
      catch: <S>(you: (exception: unknown) => S) => {
        try {
          return me(...args);
        } catch (e) {
          return you(e);
        }
      },
      catchWith: <S>(yours: S) => {
        try {
          return me(...args);
        } catch {
          return yours;
        }
      },
    };
  };
}

export function toArray<T>(
  arg: T | T[],
): T[] {
  return Array.isArray(arg) ? arg : [arg];
}
