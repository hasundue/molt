import { createAssertSnapshot, spy, Stub, stub } from "./std/testing.ts";
import { EOL, formatEOL } from "./std/fs.ts";
import { fromFileUrl } from "./std/path.ts";
import * as SemVer from "./semver.ts";

export const assertSnapshot = createAssertSnapshot({
  dir: fromFileUrl(new URL("../test/snapshots/", import.meta.url)),
});

export const CommandStub = {
  create(CommandSpy = spy(Deno.Command)) {
    return class CommandStub extends CommandSpy {
      #output: Deno.CommandOutput = {
        code: 0,
        stdout: new Uint8Array(),
        stderr: new Uint8Array(),
        success: true,
        signal: null,
      };
      outputSync() {
        return this.#output;
      }
      output() {
        return Promise.resolve(this.#output);
      }
      spawn() {
        return new Deno.ChildProcess();
      }
      static clear() {
        this.calls = [];
      }
    };
  },
};
export type CommandStub = ReturnType<typeof CommandStub.create>;

export class FileSystemFake extends Map<string | URL, string> {}

export const ReadTextFileStub = {
  create(
    fs: FileSystemFake,
    options?: {
      readThrough?: boolean;
    },
  ): Stub {
    const original = Deno.readTextFile;
    return stub(
      Deno,
      "readTextFile",
      async (path) => {
        return fs.get(path.toString()) ??
          (options?.readThrough
            ? await original(path)
            : _throw(new Deno.errors.NotFound(`File not found: ${path}`)));
      },
    );
  },
};
export type ReadTextFileStub = ReturnType<typeof ReadTextFileStub.create>;

export const WriteTextFileStub = {
  create(
    fs: FileSystemFake,
  ) {
    return stub(
      Deno,
      "writeTextFile",
      (path, data) => {
        fs.set(path.toString(), formatEOL(data.toString(), EOL.LF));
        return Promise.resolve();
      },
    );
  },
};
export type WriteTextFileStub = ReturnType<typeof WriteTextFileStub.create>;

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

export const LatestSemVerStub = {
  create(latest: string): FetchStub {
    return FetchStub.create(async (request, init) => {
      request = (request instanceof Request)
        ? request
        : new Request(request, init);
      const url = new URL(request.url);
      switch (url.hostname) {
        case "registry.npmjs.org":
          return new Response(
            JSON.stringify({ "dist-tags": { latest } }),
            { status: 200 },
          );
        case "deno.land": {
          if (request.method !== "HEAD") {
            return init.original(request);
          }
          const response = await init.original(request);
          await response.arrayBuffer();
          const semver = SemVer.extract(response.url);
          if (!semver) {
            return response;
          }
          const url = new URL(response.url.replace(semver, latest));
          return {
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
            redirected: true,
            status: 302,
            url: url.href,
          } as Response;
        }
        default:
          return init.original(request, init);
      }
    });
  },
};
export type LatestSemVerStub = ReturnType<typeof LatestSemVerStub.create>;

/**
 * Enables all test stubs.
 */
export function enableTestMode() {
  const fs = new FileSystemFake();
  ReadTextFileStub.create(fs, { readThrough: true });
  WriteTextFileStub.create(fs);
  LatestSemVerStub.create("123.456.789");
  Deno.Command = CommandStub.create();
}

/** Utility function to throw an error. */
function _throw(error: Error): never {
  throw error;
}
