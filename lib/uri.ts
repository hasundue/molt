import { isAbsolute, relative, resolve, toFileUrl } from "./std/path.ts";
import { assertEquals } from "./std/assert.ts";
import { assert, is } from "./x/unknownutil.ts";

export type DefaultProtocol<Scheme extends string> = Scheme extends
  "http" | "https" ? `${Scheme}://`
  : Scheme extends "file" ? `${Scheme}:///`
  : `${Scheme}:`;

export type URI<
  Scheme extends string = string,
  Protocol extends string = DefaultProtocol<Scheme>,
> = `${Protocol}${string}`;

export const URI = {
  /**
   * Convert a path to a file URL. If the path is relative, it is resolved from the current
   * working directory.
   */
  from(path: string | URL, base?: string): URI<"file"> {
    let url: URL;
    try {
      url = new URL(path, base);
      assertEquals(url.protocol, "file:");
    } catch {
      assert(path, is.String);
      url = toFileUrl(
        isAbsolute(path) ? path : resolve(path),
      );
    }
    if (url.protocol !== "file:") {
      throw new TypeError(`Invalid protocol: ${url.protocol} in ${path}`);
    }
    return url.href as URI<"file">;
  },
  get cwd(): URI<"file"> {
    return URI.from(Deno.cwd());
  },
  relative(uri: URI<"file">): string {
    return relative(URI.cwd, uri);
  },
  absolute(uri: URI<"file">): string {
    return new URL(uri).pathname;
  },
  ensure<S extends string>(...schemes: S[]): (uri: string) => URI<S> {
    return (uri) => {
      let url: URL;
      try {
        url = new URL(uri);
      } catch {
        throw new TypeError(`Invalid URI: ${uri}`);
      }
      if (schemes.includes(url.protocol.split(":")[0] as S)) {
        return uri as URI<S>;
      }
      throw new TypeError(`Unexpected URI protocol: ${url.protocol}`);
    };
  },
  is<S extends string>(uri: string, scheme: S): uri is URI<S> {
    try {
      const url = new URL(uri);
      return url.protocol.split(":")[0] === scheme;
    } catch {
      return false;
    }
  },
};
