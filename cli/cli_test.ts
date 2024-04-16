import { assertEquals } from "@std/assert/assert-equals";
import { stripAnsiCode } from "@std/fmt/colors";
import { fromFileUrl, join } from "@std/path";
import { createAssertSnapshot } from "@std/testing/snapshot";

// basic commands
molt("", { code: 2 });
molt("--help");
molt("--version");

// single file
molt("not_exist.ts", { code: 1 });
molt("import.ts");

// special registries
molt("jsr.ts");

// with import maps
molt("mod.ts", { dir: "import_map" });
molt("mod.ts --import-map deno.json", { dir: "import_map" });

// --ignore and --only
molt("multiple_imports.ts --ignore node-emoji");
molt("multiple_imports.ts --ignore=deno_graph,node-emoji");
molt("multiple_imports.ts --only deno.land/std");
molt("multiple_imports.ts --only=deno.land/std,deno_graph");
molt("multiple_imports.ts --only deno.land --ignore deno_graph");

// --write
molt("mod.ts --write", { dir: "multiple_modules" });

// --commit
molt("mod.ts --commit", { dir: "multiple_modules" });
molt("mod.ts --commit --prefix :package:", { dir: "multiple_modules" });
molt("mod.ts --commit --pre-commit=fmt", { dir: "multiple_modules" });

// deno.json
molt("deno.json", { dir: "import_map" });
molt("deno.json --write", { dir: "import_map" });
molt("deno.json --commit", { dir: "import_map" });

// deno.jsonc
molt("deno.jsonc", { dir: "jsonc" });
molt("deno.jsonc --write", { dir: "jsonc" });
molt("deno.jsonc --commit", { dir: "jsonc" });

// lockfile
molt("deno.json --unstable-lock not_exist.lock", { dir: "lockfile", code: 1 });
molt("deno.json --unstable-lock", { dir: "lockfile" });
molt("deno.json --unstable-lock --write", { dir: "lockfile" });
molt(
  "deno.json --commit --unstable-lock --prefix :package: --prefix-lock :lock:",
  { dir: "lockfile" },
);

//-----------------------
// Test implementation
//-----------------------

const BIN = new URL("./main.ts", import.meta.url).pathname;
const CASES = new URL("../test/cases", import.meta.url).pathname;
const CONFIG = new URL("../deno.json", import.meta.url).pathname;

function molt(line: string, opts?: {
  dir?: string;
  code?: number;
}) {
  const args = line.length > 0 ? line.split(" ") : [];

  const name = "cli - " + (opts?.dir ? opts.dir + " - " : "") +
    '"' + ["molt"].concat(args).join(" ") + '"';

  Deno.test(name, async (t) => {
    const output = await new Deno.Command("deno", {
      args: ["run", "-A", "--unstable-kv", "--config", CONFIG, BIN, ...args],
      env: { MOLT_TEST: "1" },
      cwd: join(CASES, opts?.dir ? `/${opts?.dir}` : ""),
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

const assertSnapshot = createAssertSnapshot({
  dir: fromFileUrl(new URL("../test/snapshots/", import.meta.url)),
});
