import { isAbsolute, relative, resolve, toFileUrl } from "./std/path.ts";
import { assert, is } from "./x/unknownutil.ts";
import { Brand } from "./types.ts";

export type DefaultProtocol<Scheme extends string> = Scheme extends
  "http" | "https" ? `${Scheme}://`
  : Scheme extends "file" ? `${Scheme}:///`
  : `${Scheme}:`;

export type URI<
  Scheme extends string = string,
  Protocol extends string = DefaultProtocol<Scheme>,
> = `${Protocol}${string}`;

export type RelativePath = Brand<string, "RelativePath">;
export type AbsolutePath = Brand<string, "AbsolutePath">;

export const URI = {
  /**
   * Convert a path to a file URL. If the path is relative, it is resolved from the current
   * working directory.
   */
  from(path: string | URL): URI<"file"> {
    let url: URL;
    try {
      url = new URL(path);
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
  relative(uri: URI<"file">): RelativePath {
    return relative(Deno.cwd(), new URL(uri).pathname) as RelativePath;
  },
  absolute(uri: URI<"file">): AbsolutePath {
    return resolve(new URL(uri).pathname) as AbsolutePath;
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
