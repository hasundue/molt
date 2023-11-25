import { assertEquals } from "../../lib/std/assert.ts";
import { stripAnsiCode } from "../../lib/std/fmt.ts";
import { assertSnapshot } from "../../lib/testing.ts";

function stringify(data: Uint8Array) {
  const decoder = new TextDecoder();
  let text = decoder.decode(data);
  if (Deno.build.os === "windows") {
    text = text
      .replace(/\r\n/g, "\n")
      .replace(/\\/g, "/");
  }
  return stripAnsiCode(text);
}

function test(cmd: string, code = 0) {
  const [, ...args] = cmd.split(" ");
  Deno.test(cmd, async (t) => {
    const output = await new Deno.Command("deno", {
      args: ["run", "-A", "./cli.ts", ...args],
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

const dir = "test/data";

test("molt", 2);
test("molt --help");
test("molt --version");

test(`molt not_exist.ts`, 1);
test(`molt ${dir}/import.ts`);

test(`molt ${dir}/import_map/mod.ts`);
test(`molt ${dir}/import_map/mod.ts --import-map ${dir}/import_map/deno.json`);
test(`molt ${dir}/import_map/deno.json`, 1);
test(
  `molt ${dir}/import_map/mod.ts --import-map not_exist.json`,
  1,
);

test(`molt ${dir}/multiple_imports.ts --ignore node-emoji`);
test(`molt ${dir}/multiple_imports.ts --ignore=deno_graph,node-emoji`);

test(`molt ${dir}/multiple_imports.ts --only deno.land/std`);
test(`molt ${dir}/multiple_imports.ts --only=deno.land/std,deno_graph`);

test(`molt ${dir}/multiple_modules/mod.ts --write`);
test(
  `molt ${dir}/multiple_modules/mod.ts --write --summary title.txt --report body.md`,
);

test(`molt ${dir}/multiple_modules/mod.ts --commit`);
test(`molt ${dir}/multiple_modules/mod.ts --commit --prefix :package:`);
test(
  `molt ${dir}/multiple_modules/mod.ts --commit --pre-commit=fmt --post-commit=lint`,
);
test(
  `molt ${dir}/multiple_modules/mod.ts --commit --summary title.txt --report body.md`,
);
test(
  `molt ${dir}/multiple_modules/mod.ts --commit --summary title.txt --pre-commit=fmt`,
);
