import { $ } from "../../lib/x/dax.ts";
import { assertSnapshot } from "../../lib/std/testing.ts";
import { assertEquals } from "../../lib/std/assert.ts";
import { stripAnsiCode } from "../../lib/std/fmt.ts";

function stringify(data: Uint8Array) {
  const decoder = new TextDecoder();
  const text = decoder.decode(data);
  return stripAnsiCode(text);
}

function test(cmd: string, code = 0) {
  const [command, ...args] = cmd.split(" ");
  Deno.test(cmd, async (t) => {
    const output = await new Deno.Command(command, {
      args,
      env: { MOLT_TEST: "1" },
    }).output();
    const stdout = stringify(output.stdout);
    const stderr = stringify(output.stderr);
    try {
      assertEquals(output.code, code);
    } catch (err) {
      console.error(stdout);
      console.error(stderr);
      throw err;
    }
    await assertSnapshot(t, stdout);
    await assertSnapshot(t, stderr);
  });
}

await $`deno task -q install`;

const dir = "test/fixtures";

test("molt");
test("molt --help");
test("molt --version");

test("molt check", 2);
test("molt check --help");

test("molt update", 2);
test("molt update --help");
test(`molt update ${dir}/not_exist.ts`, 1);
test(`molt update ${dir}/import-map/deno.json`, 1);
test(`molt update ${dir}/direct-import/mod.ts`);
test(`molt update ${dir}/import-map/mod.ts`);
test(
  `molt update ${dir}/import-map/mod.ts --import-map ${dir}/import-map/deno.json`,
);
test(
  `molt update ${dir}/import-map/mod.ts --import-map ${dir}/import-map/not_exist.json`,
  1,
);

test(`molt update ${dir}/direct-import/mod.ts --commit`);
test(`molt update ${dir}/direct-import/mod.ts --commit --prefix :package:`);
test(
  `molt update ${dir}/direct-import/mod.ts --commit --pre-commit=fmt --post-commit=lint`,
);
test(
  `molt update ${dir}/direct-import/mod.ts --commit --summary title.txt --report body.md`,
);
