import { assertObjectMatch } from "./std/assert.ts";
import { assertSpyCall, assertSpyCalls } from "./std/testing.ts";
import { CommandStub } from "./testing.ts";

Deno.test("CommandStub", async () => {
  const Command = CommandStub.create();
  const output = await new Command("echo").output();
  assertObjectMatch(output, {
    code: 0,
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    success: true,
    signal: null,
  });
  assertSpyCall(Command, 0, {
    args: ["echo", undefined],
  });
  assertSpyCalls(Command, 1);
});
