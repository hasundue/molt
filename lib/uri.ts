import { isAbsolute, relative, resolve, toFileUrl } from "./std/path.ts";

export type DefaultProtocol<Scheme extends string> = Scheme extends
  "http" | "https" ? `${Scheme}://`
  : Scheme extends "file" ? `${Scheme}:///`
  : `${Scheme}:`;

export type URI<
  Scheme extends string = string,
  Protocol extends string = DefaultProtocol<Scheme>,
> = `${Protocol}${string}`;

export const URI = {
  from(path: string): URI<"file"> {
    let url: URL;
    try {
      url = new URL(path);
    } catch {
      return toFileUrl(
        isAbsolute(path) ? path : resolve(path),
      ).href as URI<"file">;
    }
    if (url.protocol !== "file:") {
      throw new TypeError();
    }
    return url.href as URI<"file">;
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
      if (schemes.includes(url.protocol.split(":")[0] as S)) {
        return uri as URI<S>;
      }
      throw new TypeError(`Unexpected URI protocol: ${url.protocol}`);
    };
  },
};
