import {
  assertArrayIncludes,
  assertEquals,
  assertObjectMatch,
} from "@std/assert";
import {
  curateBreakingChange,
  curateChangeLog,
  parseCommit,
} from "./changelog.ts";

Deno.test("parseCommit", () => {
  assertObjectMatch(
    parseCommit("fix: accept a lock file without `dependencies`"),
    {
      type: "fix",
      scope: null,
      subject: "accept a lock file without `dependencies`",
      body: "",
    },
  );
  assertObjectMatch(
    parseCommit("test(cli): update snapshot"),
    {
      type: "test",
      scope: "cli",
      subject: "update snapshot",
      body: "",
    },
  );
  assertObjectMatch(
    parseCommit(`refactor(core)!: use deno_lockfile crate internally

BREAKING CHANGE: rename \`--unstable-lock\` as \`--lock\`
`),
    {
      type: "refactor",
      scope: "core",
      subject: "use deno_lockfile crate internally",
      notes: [
        {
          title: "BREAKING CHANGE",
          text: "rename `--unstable-lock` as `--lock`",
        },
      ],
    },
  );
});

Deno.test("curateBreakingChange", () => {
  assertArrayIncludes(
    curateBreakingChange(
      parseCommit(`refactor(core)!: use deno_lockfile crate internally

BREAKING CHANGE: rename \`--unstable-lock\` as \`--lock\`
`),
    ),
    ["rename `--unstable-lock` as `--lock`"],
  );
  assertEquals(
    curateBreakingChange(
      parseCommit("fix: accept a lock file without `dependencies`"),
    ).length,
    0,
  );
});

Deno.test("createChangeLog", () => {
  const messages = [
    "feat: add `--lock` option",
    "fix(cli): accept a lock file without `dependencies`",
    `refactor(core)!: use deno_lockfile crate internally

BREAKING CHANGE: rename \`--unstable-lock\` as \`--lock\`
`,
  ];

  const changelog = curateChangeLog(messages, {
    types: ["feat", "fix"],
  });

  assertEquals(changelog["feat"].length, 1);
  assertObjectMatch(
    changelog["feat"][0],
    {
      scope: null,
      text: "add `--lock` option",
    },
  );
  assertEquals(changelog["fix"].length, 1);
  assertObjectMatch(
    changelog["fix"][0],
    {
      scope: "cli",
      text: "accept a lock file without `dependencies`",
    },
  );
  assertEquals(changelog["BREAKING CHANGE"].length, 1);
  assertObjectMatch(
    changelog["BREAKING CHANGE"][0],
    {
      scope: null,
      text: "rename `--unstable-lock` as `--lock`",
    },
  );

  const scoped = curateChangeLog(messages, {
    types: ["feat", "fix"],
    scope: "cli",
  });

  assertEquals(scoped["feat"].length, 0);
  assertEquals(scoped["fix"].length, 1);
  assertObjectMatch(
    scoped["fix"][0],
    {
      scope: null,
      text: "accept a lock file without `dependencies`",
    },
  );
  assertEquals(scoped["BREAKING CHANGE"].length, 0);
});
