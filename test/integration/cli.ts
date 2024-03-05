import { assertEquals } from "../../lib/std/assert.ts";
import { stripAnsiCode } from "../../lib/std/fmt.ts";
import { join } from "../../lib/std/path.ts";
import { assertSnapshot } from "../../lib/testing.ts";

// basic commands
molt("", { code: 2 });
molt("--help");
molt("--version");

// single file
molt("not_exist.ts", { code: 1 });
molt("import.ts");

// special registries
molt("jsr.ts");

// import maps
molt("mod.ts", { cwd: "import_map" });
molt("mod.ts --import-map deno.json", { cwd: "import_map" });
molt("deno.json", { cwd: "import_map", code: 1 });

// --ignore and --only
molt("multiple_imports.ts --ignore node-emoji");
molt("multiple_imports.ts --ignore=deno_graph,node-emoji");
molt("multiple_imports.ts --only deno.land/std");
molt("multiple_imports.ts --only=deno.land/std,deno_graph");
molt("multiple_imports.ts --only deno.land --ignore deno_graph");

// --write
molt("mod.ts --write", { cwd: "multiple_modules" });
molt(
  "mod.ts --write --summary title.txt --report body.md",
  { cwd: "multiple_modules" },
);

// --commit
molt("mod.ts --commit", { cwd: "multiple_modules" });
molt("mod.ts --commit --prefix :package:", { cwd: "multiple_modules" });
molt(
  "mod.ts --commit --pre-commit=fmt --post-commit=lint",
  { cwd: "multiple_modules" },
);
molt(
  "mod.ts --commit --summary title.txt --report body.md",
  { cwd: "multiple_modules" },
);
molt(
  "mod.ts --commit --summary title.txt --pre-commit=fmt",
  { cwd: "multiple_modules" },
);

//-----------------------
// Test implementation
//-----------------------

const BIN = new URL("../../cli.ts", import.meta.url).pathname;
const DATA = new URL("../data", import.meta.url).pathname;

function molt(line: string, opts?: {
  cwd?: string;
  code?: number;
}) {
  const args = line.length > 0 ? line.split(" ") : [];

  const name = "cli - " + (opts?.cwd ? opts.cwd + " - " : "") +
    '"' + ["molt"].concat(args).join(" ") + '"';

  Deno.test(name, async (t) => {
    const output = await new Deno.Command("deno", {
      args: ["run", "-A", BIN, ...args],
      env: { MOLT_TEST: "1" },
      cwd: join(DATA, opts?.cwd ? `/${opts?.cwd}` : ""),
    }).output();

    const stdout = stringify(output.stdout);
    const stderr = stringify(output.stderr);
    try {
      assertEquals(output.code, opts?.code ?? 0);
    } catch (err) {
      console.error(stdout);
      console.error(stderr);
      throw err;
    }
    await assertSnapshot(t, stdout);
    await assertSnapshot(t, stderr);
  });
}

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
