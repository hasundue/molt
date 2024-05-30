import { stub } from "@std/testing/mock";

export const FetchStub = {
  create(
    createResponse: (
      request: string | URL | Request,
      init: RequestInit & { original: typeof fetch },
    ) => Response | Promise<Response>,
  ) {
    const original = globalThis.fetch;
    return stub(
      globalThis,
      "fetch",
      (request, init) =>
        Promise.resolve(createResponse(request, { ...init, original })),
    );
  },
};
export type FetchStub = ReturnType<typeof FetchStub.create>;

export const LatestVersionStub = {
  create(
    replacer: string | Record<string, string | undefined>,
  ): FetchStub {
    return FetchStub.create((request, init) => {
      request = (request instanceof Request)
        ? request
        : new Request(request, init);
      const url = new URL(request.url);
      const latest = typeof replacer === "string"
        ? replacer
        : Object.entries(replacer)
          .find(([pattern]) => url.href.includes(pattern))?.[1] ??
          replacer["_"];
      if (!latest) {
        return init.original(request, init);
      }
      switch (url.hostname) {
        case "registry.npmjs.org":
          return new Response(
            JSON.stringify({ "dist-tags": { latest } }),
            { status: 200 },
          );
        case "jsr.io":
          if (!url.pathname.endsWith("meta.json")) {
            return init.original(request, init);
          }
          return new Response(
            JSON.stringify({
              versions: {
                [latest]: {},
              },
            }),
            { status: 200 },
          );
        case "deno.land": {
          if (request.method !== "HEAD") {
            return init.original(request);
          }
          const { name, path } = parseDenoLandUrl(url);
          return {
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
            redirected: true,
            status: 302,
            url: `https://${name}@${latest}${path}`,
          } as Response;
        }
        default:
          return init.original(request, init);
      }
    });
  },
};
export type LatestVersionStub = ReturnType<typeof LatestVersionStub.create>;

function parseDenoLandUrl(url: URL) {
  const std = url.pathname.startsWith("/std");
  const matched = std
    ? url.pathname.match(
      /^\/std(?:@(?<version>[^/]+))?(?<path>\/(.*)$)/,
    )
    : url.pathname.match(
      /^\/x\/(?<name>[^/]+)(?:@(?<version>[^/]+))?(?<path>\/(.*)$)/,
    );
  if (!matched) {
    throw new Error(`Unexpected URL: ${url}`);
  }
  const { name, version, path } = matched.groups!;
  return {
    name: std ? "deno.land/std" : `deno.land/x/${name}`,
    version,
    // Remove a trailing slash if it exists to imitate the behavior of typical
    // Web servers.
    path: path.replace(/\/$/, ""),
  };
}
