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

export function createCommandStub(): ConstructorSpy {
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

export class FileSystemFake extends Map<string | URL, Uint8Array> {}

export function createReadTextFileStub(
  fs: FileSystemFake,
  options?: {
    readThrough?: boolean;
  },
): Stub {
  const decoder = new TextDecoder();
  return stub(
    Deno,
    "readTextFile",
    async (path) => {
      const data = fs.get(path) ?? options?.readThrough
        ? await Deno.readFile(path)
        : _throw(new Deno.errors.NotFound(`File not found: ${path}`));
      return decoder.decode(data);
    },
  );
}

export function createWriteTextFileStub(
  fs: FileSystemFake,
): Stub {
  const encoder = new TextEncoder();
  return stub(
    Deno,
    "writeTextFile",
    // deno-lint-ignore require-await
    async (path, data) => {
      fs.set(path, encoder.encode(data.toString()));
    },
  );
}

/** Asserts that a spy is called as expected at any index. */
export function assertSomeSpyCall<
  Self,
  Args extends unknown[],
  Return,
>(
  spy: Spy<Self, Args, Return>,
  expected: ExpectedSpyCall<Self, Args, Return>,
) {
  const some = spy.calls.some((_, index) => {
    try {
      assertSpyCall(spy, index, expected);
      return true;
    } catch {
      return false;
    }
  });
  if (!some) {
    throw new AssertionError("Expected spy call does not exist");
  }
}

export function assertSomeSpyCallArg<
  Self,
  Args extends unknown[],
  Return,
  ExpectedArg,
>(
  spy: Spy<Self, Args, Return>,
  argIndex: number,
  expected: ExpectedArg,
) {
  const some = spy.calls.some((_, index) => {
    try {
      assertSpyCallArg(spy, index, argIndex, expected);
      return true;
    } catch {
      return false;
    }
  });
  if (!some) {
    throw new AssertionError("Expected spy call does not exist");
  }
}

/** Utility function to throw an error. */
function _throw(error: Error): never {
  throw error;
}
