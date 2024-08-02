import { assertEquals } from "@std/assert";
import { compareCommits } from "./commits.ts";

Deno.test("compareCommits", async () => {
  assertEquals(
    await compareCommits(
      {
        host: "github",
        owner: "hasundue",
        name: "molt",
      },
      "0.17.0",
      "0.17.2",
    ),
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

Deno.test("compareCommits - non existing tags", async () => {
  assertEquals(
    await compareCommits(
      {
        host: "github",
        owner: "hasundue",
        name: "molt",
      },
      "0.0.1",
      "0.0.2",
    ),
    [],
  );
});
