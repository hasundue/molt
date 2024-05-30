import { assertEquals } from "@std/assert/assert-equals";
import { stripAnsiCode } from "@std/fmt/colors";
import { describe, it } from "@std/testing/bdd";
import dedent from "dedent";

const BIN = new URL("./main.ts", import.meta.url).pathname;
const DIR = new URL("../test/fixtures", import.meta.url).pathname;
const CONFIG = new URL("../deno.json", import.meta.url).pathname;

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function molt(argstr: string): Promise<CommandResult> {
  const args = argstr.split(" ").filter((it) => it.length);
  const { code, stderr, stdout } = await new Deno.Command("deno", {
    args: ["run", "-A", "--unstable-kv", "--config", CONFIG, BIN, ...args],
    env: { MOLT_TEST: "1" },
    cwd: DIR,
  }).output();
  const decoder = new TextDecoder();
  const format = (bytes: Uint8Array) =>
    stripAnsiCode(decoder.decode(bytes)).trim();
  return {
    code,
    stderr: format(stderr),
    stdout: format(stdout),
  };
}

describe("CLI", () => {
  it("should error without arguments", async () => {
    const { code, stderr } = await molt("");
    assertEquals(code, 2);
    assertEquals(stderr, "error: Missing argument(s): modules");
  });

  it("should print the version", async () => {
    const { stdout } = await molt("--version");
    const { default: config } = await import("./deno.json", {
      with: { type: "json" },
    });
    assertEquals(stdout, config.version);
  });

  it("should find updates from `deno.jsonc`", async () => {
    const { stdout } = await molt("deno.jsonc");
    assertEquals(
      stdout,
      dedent`
        📦 @octokit/core 6.1.0 => 123.456.789
        📦 @std/assert 0.222.0 => 123.456.789
        📦 @std/bytes  => 123.456.789
        📦 @std/testing 0.222.0 => 123.456.789
        📦 deno.land/std 0.222.0,  => 123.456.789
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      `,
    );
  });

  it("should update `deno.jsonc`", async () => {
    const { code, stdout } = await molt("deno.jsonc --write");
    assertEquals(code, 0);
    assertEquals(
      stdout,
      dedent`
        📦 @octokit/core 6.1.0 => 123.456.789
        📦 @std/assert 0.222.0 => 123.456.789
        📦 @std/bytes  => 123.456.789
        📦 @std/testing 0.222.0 => 123.456.789
        📦 deno.land/std 0.222.0,  => 123.456.789
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789

        💾 deno.jsonc
      `,
    );
  });

  it("should commit changes to `deno.jsonc`", async () => {
    const { code, stdout } = await molt("deno.jsonc --commit");
    assertEquals(code, 0);
    assertEquals(
      stdout,
      dedent`
        📦 @octokit/core 6.1.0 => 123.456.789
        📦 @std/assert 0.222.0 => 123.456.789
        📦 @std/bytes  => 123.456.789
        📦 @std/testing 0.222.0 => 123.456.789
        📦 deno.land/std 0.222.0,  => 123.456.789
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789

        📝 bump @octokit/core from 6.1.0 to 123.456.789
        📝 bump @std/assert from 0.222.0 to 123.456.789
        📝 bump @std/bytes to 123.456.789
        📝 bump @std/testing from 0.222.0 to 123.456.789
        📝 bump deno.land/std from 0.222.0 to 123.456.789
        📝 bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
      `,
    );
  });

  it("should find updates to mod_test.ts", async () => {
    // FIXME: We must pass `--import-map` explicitly because `@chiezo/amber`
    // does not support `Deno.readDir` yet, which is called by `findFileUp`.
    const { stdout } = await molt("mod_test.ts --import-map deno.jsonc");
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
          mod_test.ts
        📦 @std/testing 0.222.0 => 123.456.789
          deno.jsonc
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
          mod.ts
      `,
    );
  });

  it("should write updates collected from mod_test.ts", async () => {
    const { code, stdout } = await molt(
      "mod_test.ts --import-map deno.jsonc --write",
    );
    assertEquals(code, 0);
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
          mod_test.ts
        📦 @std/testing 0.222.0 => 123.456.789
          deno.jsonc
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
          mod.ts

        💾 deno.jsonc
        💾 mod_test.ts
        💾 mod.ts
      `,
    );
  });

  it("should commit updates collected from mod_test.ts", async () => {
    const { code, stdout } = await molt(
      "mod_test.ts --import-map deno.jsonc --commit",
    );
    assertEquals(code, 0);
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
          mod_test.ts
        📦 @std/testing 0.222.0 => 123.456.789
          deno.jsonc
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
          mod.ts

        📝 bump @std/assert from 0.222.0 to 123.456.789
        📝 bump @std/testing from 0.222.0 to 123.456.789
        📝 bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
      `,
    );
  });

  it("should ignore dependencies with `--ignore` option", async () => {
    const { stdout } = await molt("deno.jsonc --ignore std");
    assertEquals(
      stdout,
      dedent`
        📦 @octokit/core 6.1.0 => 123.456.789
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      `,
    );
  });

  it("should accept multiple entries for `--ignore` option", async () => {
    const { stdout } = await molt("deno.jsonc --ignore=std,octokit");
    assertEquals(
      stdout,
      dedent`
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      `,
    );
  });

  it("should filter updates with `--only` option", async () => {
    const { stdout } = await molt("deno.jsonc --only std");
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
        📦 @std/bytes  => 123.456.789
        📦 @std/testing 0.222.0 => 123.456.789
        📦 deno.land/std 0.222.0,  => 123.456.789
      `,
    );
  });

  it("should accept multiple entries for `--only` option", async () => {
    const { stdout } = await molt("deno.jsonc --only=octokit,deno_graph");
    assertEquals(
      stdout,
      dedent`
        📦 @octokit/core 6.1.0 => 123.456.789
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      `,
    );
  });

  it("should not resolve local imports with `--no-resolve` option", async () => {
    const { stdout } = await molt("mod_test.ts --no-resolve");
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
      `,
    );
  });

  it("should run tasks before each commit with `--pre-commit` option", async () => {
    const { stdout } = await molt("mod.ts --commit --pre-commit=fmt,lint");
    assertEquals(
      stdout,
      dedent`
      📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      
      💾 bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
      🔨 Running task fmt...
      🔨 Running task lint...
      📝 bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
      `,
    );
  });

  it("should prefix commit messages with `--prefix` option", async () => {
    const { stdout } = await molt("mod.ts --commit --prefix=chore:");
    assertEquals(
      stdout,
      dedent`
      📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
      
      📝 chore: bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
      `,
    );
  });

  // FIXME: The list of files only includes `deno.jsonc`
  it.ignore("should find updates to a lock file with `--unstable-lock` option", async () => {
    const { stdout } = await molt(
      "mod_test.ts --unstable-lock --import-map deno.jsonc --write",
    );
    assertEquals(
      stdout,
      dedent`
        📦 @std/assert 0.222.0 => 123.456.789
          mod_test.ts
          deno.lock
        📦 @std/testing 0.222.0 => 123.456.789
          deno.jsonc
          deno.lock
        📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
          mod.ts
          deno.lock

        💾 deno.jsonc
        💾 deno.lock
        💾 mod_test.ts
        💾 mod.ts
      `,
    );
  });
});
