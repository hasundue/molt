import { spy, ConstructorSpy } from "./std/testing.ts";

export function createCommandStub(): ConstructorSpy {
  const Spy = spy(Deno.Command);
  return class extends Spy {
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
  }
}
