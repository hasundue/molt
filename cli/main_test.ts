import { assertEquals } from "@std/assert";
import { stripAnsiCode } from "@std/fmt/colors";
import { fromFileUrl } from "@std/path";
import { describe, it } from "@std/testing/bdd";
import dedent from "dedent";

interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

async function molt(argstr: string): Promise<CommandResult> {
  const args = argstr.split(" ").filter((it) => it.length);
  const main = fromFileUrl(new URL("./main.ts", import.meta.url));

  const { code, stderr, stdout } = await new Deno.Command("deno", {
    args: ["run", "-A", main, "--dry-run", ...args],
    cwd: new URL("./fixtures", import.meta.url),
  }).output();

  const format = (bytes: Uint8Array) =>
    stripAnsiCode(new TextDecoder().decode(bytes)).trim();

  return {
    code,
    stderr: format(stderr),
    stdout: format(stdout),
  };
}

describe("CLI", () => {
  it("should find updates in `deno.json` by default", async () => {
    const { stderr, stdout } = await molt("");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1 (^0.3.0 → ^0.4.0)
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
    assertEquals(
      stderr,
      dedent`
        Collecting dependencies
        Fetching updates
      `,
    );
  });

  it("should not throw with `--changelog`", async () => {
    await molt("--changelog");
  });

  it("should update `deno.json` with `--write`", async () => {
    const { stderr, stdout } = await molt("--write");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1 (^0.3.0 → ^0.4.0)
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
    assertEquals(
      stderr,
      dedent`
        Collecting dependencies
        Fetching updates
        Writing changes
      `,
    );
  });

  it("should handle explicitly-specified `deno.json` with `--write`", async () => {
    const { stderr } = await molt("deno.json --write");
    assertEquals(
      stderr,
      dedent`
        Collecting dependencies
        Fetching updates
        Writing changes
      `,
    );
  });

  it("should error on multiple configuration files", async () => {
    const { stderr } = await molt("deno.json deno.jsonc");
    assertEquals(
      stderr,
      "Multiple configuration files found: deno.json, deno.jsonc",
    );
  });

  it("should commit updates with `--commit`", async () => {
    const { stderr, stdout } = await molt("--commit --prefix chore:");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1 (^0.3.0 → ^0.4.0)
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
    assertEquals(
      stderr,
      dedent`
        Collecting dependencies
        Fetching updates
        Committing chore: bump @conventional-commits/parser to 0.4.1
        Committing chore: bump @luca/flag from 1.0.0 to 1.0.1
        Committing chore: bump deno.land/std from 0.222.0 to 0.224.0
      `,
    );
  });

  it("should find the same updates with `--lock deno.lock`", async () => {
    const { stdout } = await molt("--lock deno.lock");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1 (^0.3.0 → ^0.4.0)
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });

  it("should only find updates to constraints with `--no-lock`", async () => {
    const { stdout } = await molt("--no-lock");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser ^0.3.0 → ^0.4.0
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });

  it("should ignore an unsupported version of lockfile with a warning", async () => {
    const { stdout, stderr } = await molt("--lock deno.lock.future");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser ^0.3.0 → ^0.4.0
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
    assertEquals(
      stderr,
      dedent`
        Unsupported lockfile version: '4'. Please update the lock file manually.
        Collecting dependencies
        Fetching updates
      `,
    );
  });

  it("should filter dependencies with `--only`", async () => {
    const { stdout } = await molt("--only flag");
    assertEquals(
      stdout,
      dedent`
        📦 @luca/flag 1.0.0 → 1.0.1
      `,
    );
  });

  it("should filter out dependencies with `--ignore`", async () => {
    const { stdout } = await molt("--ignore flag");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1 (^0.3.0 → ^0.4.0)
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });

  it("should find updates in modules with `--no-config`", async () => {
    const { stdout } = await molt("--no-config");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });

  it("should find updates in the specified module", async () => {
    const { stdout } = await molt("--no-config mod.ts");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });

  it("should also find updates in modules with `--no-config` and `--no-lock`", async () => {
    const { stdout } = await molt("--no-config --no-lock");
    assertEquals(
      stdout,
      dedent`
        📦 @conventional-commits/parser 0.3.0 → 0.4.1
        📦 @luca/flag 1.0.0 → 1.0.1
        📦 deno.land/std 0.222.0 → 0.224.0
      `,
    );
  });
});
