import { assertObjectMatch } from "./std/assert.ts";
import { assertSpyCall, assertSpyCalls } from "./std/testing.ts";
import { createCommandStub } from "./testing.ts";

Deno.test("CommandStub", async () => {
  const CommandStub = createCommandStub();
  const output = await new CommandStub("echo").output();
  assertObjectMatch(output, {
    code: 0,
    stdout: new Uint8Array(),
    stderr: new Uint8Array(),
    success: true,
    signal: null,
  });
  assertSpyCall(CommandStub, 0, {
    args: ["echo"],
  });
  assertSpyCalls(CommandStub, 1);
});
