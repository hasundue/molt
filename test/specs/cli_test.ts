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
  const [, ...args] = cmd.split(" ");
  const COMMAND_MOLT = Deno.build.os === "windows" ? "molt.cmd" : "molt";
  Deno.test(cmd, async (t) => {
    const output = await new Deno.Command(COMMAND_MOLT, {
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

await $`deno task -q install`.quiet();

const dir = "test/fixtures";

test("molt", 2);
test("molt --help");
test("molt --version");

test(`molt not_exist.ts`, 1);
test(`molt ${dir}/import-map/deno.json`, 1);
test(`molt ${dir}/direct-import/mod.ts`);
test(`molt ${dir}/import-map/mod.ts`);
test(`molt ${dir}/import-map/mod.ts --import-map ${dir}/import-map/deno.json`);
test(
  `molt ${dir}/import-map/mod.ts --import-map not_exist.json`,
  1,
);

test(`molt ${dir}/direct-import/mod.ts --write`);
test(
  `molt ${dir}/direct-import/mod.ts --write --summary title.txt --report body.md`,
);

test(`molt ${dir}/direct-import/mod.ts --commit`);
test(`molt ${dir}/direct-import/mod.ts --commit --prefix :package:`);
test(
  `molt ${dir}/direct-import/mod.ts --commit --pre-commit=fmt --post-commit=lint`,
);
test(
  `molt ${dir}/direct-import/mod.ts --commit --summary title.txt --report body.md`,
);
