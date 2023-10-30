import {
  assertSpyCall,
  assertSpyCallArg,
  ConstructorSpy,
  ExpectedSpyCall,
  Spy,
  spy,
  Stub,
  stub,
} from "./std/testing.ts";
import { AssertionError } from "./std/assert.ts";
import { URI } from "./uri.ts";

export function createCommandStub(): ConstructorSpy<
  Deno.Command,
  ConstructorParameters<typeof Deno.Command>
> {
  const CommandSpy = spy(Deno.Command);
  return class extends CommandSpy {
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
}

export class FileSystemFake extends Map<URI<"file">, string> {}

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
        return fs.get(URI.from(path)) ?? options?.readThrough
          ? await original(path)
          : _throw(new Deno.errors.NotFound(`File not found: ${path}`));
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
      // deno-lint-ignore require-await
      async (path, data) => {
        fs.set(URI.from(path), data.toString());
      },
    );
  },
};
export type WriteTextFileStub = ReturnType<typeof WriteTextFileStub.create>;

/** Asserts that a spy is called as expected at any index. */
export function assertFindSpyCall<
  Self,
  Args extends unknown[],
  Return,
>(
  spy: Spy<Self, Args, Return>,
  expected: ExpectedSpyCall<Self, Args, Return>,
) {
  const call = spy.calls.find((_, index) => {
    try {
      assertSpyCall(spy, index, expected);
      return true;
    } catch {
      return false;
    }
  });
  if (!call) {
    throw new AssertionError("Expected spy call does not exist");
  }
  return call;
}

export function assertFindSpyCallArg<
  Self,
  Args extends unknown[],
  Return,
  ExpectedArg,
>(
  spy: Spy<Self, Args, Return>,
  argIndex: number,
  expected: ExpectedArg,
) {
  const call = spy.calls.find((_, index) => {
    try {
      assertSpyCallArg(spy, index, argIndex, expected);
      return true;
    } catch {
      return false;
    }
  });
  if (!call) {
    throw new AssertionError("Expected spy call does not exist");
  }
  return call;
}

/** Utility function to throw an error. */
function _throw(error: Error): never {
  throw error;
}
