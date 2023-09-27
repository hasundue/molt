import {
  isAbsolute,
  relative,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";

type DefaultProtocol<Scheme extends string> = Scheme extends "http" | "https"
  ? `${Scheme}://`
  : Scheme extends "file" ? `${Scheme}:///`
  : `${Scheme}:`;

export type URI<
  Scheme extends string = string,
  Protocol extends string = DefaultProtocol<Scheme>,
> = `${Protocol}${string}`;

export const URI = {
  from(path: string): URI<"file"> {
    return toFileUrl(
      isAbsolute(path) ? path : resolve(path),
    ).href as URI<"file">;
  },
  toRelativePath(uri: URI<"file">): string {
    return relative(Deno.cwd(), new URL(uri).pathname);
  },
  toAbsolutePath(uri: URI<"file">): string {
    return resolve(new URL(uri).pathname);
  },
  ensure<S extends string>(...schemes: S[]): (uri: string) => URI<S> {
    return (uri) => {
      let url: URL;
      try {
        url = new URL(uri);
      } catch {
        throw new TypeError(`Invalid URI: ${uri}`);
      }
      if (url.protocol.split(":")[0] in schemes) {
        return uri as URI<S>;
      }
      throw new TypeError(`Unexpected URI protocol: ${url.protocol}`);
    };
  },
  assert(uri: string): asserts uri is URI {
    try {
      new URL(uri);
    } catch {
      throw new TypeError(`Invalid URI: ${uri}`);
    }
  },
};

// deno-lint-ignore no-explicit-any
export interface CatchMe<T = any> {
  catch: (you: (exception: unknown) => T) => T;
}
