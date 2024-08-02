import { assertArrayIncludes, assertEquals } from "@std/assert";
import "@std/dotenv/load";
import { compareCommits, getTags, resolvePackageRoot } from "./github.ts";
import { parse } from "./packages.ts";
import type { Repository } from "./repository.ts";

Deno.test("compareCommits", async () => {
  const repo = {
    host: "github",
    owner: "hasundue",
    name: "molt",
  } satisfies Repository;
  assertEquals(
    await compareCommits(repo, "0.17.0", "0.17.2"),
    [
      "fix: accept a lock file without `dependencies`",
      "test(cli): update snapshot",
      "chore(task/update): enable `--unstable-lock`",
      "chore(cli): `--version` returns `dev` if undefined",
      "test(lib/file): check EOL at the end of file",
      "fix: add EOL at the end of updated lock file",
      "test(cli): stub latest version of `jsr:@std/`",
      "test(cli): update snapshot",
      "build(deps): bump deno.land/std from 0.219.1 to 0.220.1",
    ],
  );
});

Deno.test("getTags", async () => {
  const repo = {
    host: "github",
    owner: "hasundue",
    name: "molt",
  } satisfies Repository;
  assertArrayIncludes(await getTags(repo), [
    "0.18.5",
    "0.19.0",
  ]);
});

Deno.test("resolvePackageRoot", async () => {
  //
  // An example of a single package repository
  //
  const match: Repository = {
    host: "github",
    owner: "jsr-core",
    name: "match",
  };
  assertEquals(
    await resolvePackageRoot(
      match,
      parse("jsr:@core/match"),
      "735360d",
    ),
    ".",
  );
  //
  // An example of a monorepo with multiple packages
  //
  const cliffy: Repository = {
    host: "github",
    owner: "JOTSR",
    name: "deno-cliffy",
  };
  assertEquals(
    await resolvePackageRoot(
      cliffy,
      parse("jsr:@cliffy/command"),
      "297574f",
    ),
    "command",
  );
  assertEquals(
    await resolvePackageRoot(
      cliffy,
      parse("jsr:@molt/core"),
      "297574f",
    ),
    undefined,
  );
});
