import {
  assertSpyCall,
  ConstructorSpy,
  ExpectedSpyCall,
  Spy,
  spy,
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
    throw new AssertionError("spy call does not exist");
  }
}
