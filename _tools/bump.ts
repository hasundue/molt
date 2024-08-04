import { associateWith, maxWith } from "@std/collections";
import { compare, format, increment, parse, ReleaseType } from "@std/semver";

const MEMBERS = ["core", "cli", "integration", "lib"] as const;
type Member = typeof MEMBERS[number];

type Config = {
  version: string;
};

const [type, ...targets] = Deno.args as [ReleaseType, ...Member[]];

const JSONS = associateWith(
  MEMBERS,
  (pkg) => JSON.parse(Deno.readTextFileSync(`./${pkg}/deno.json`)) as Config,
);

const vers = Object.values(JSONS).map((json) => json.version).map(parse);
const max = maxWith(vers, compare)!;
const bumped = format(increment(max, type));

for (const [member, json] of Object.entries(JSONS)) {
  if (!targets.includes(member as Member)) {
    continue;
  }
  json.version = bumped;
  await Deno.writeTextFile(
    `./${member}/deno.json`,
    JSON.stringify(json, null, 2) + "\n",
  );
}

await new Deno.Command("git", {
  args: [
    "commit",
    "-m",
    `chore: release ${bumped}`,
    ...targets.map((it) => `${it}/deno.json`),
  ],
  stdout: "inherit",
  stderr: "inherit",
}).output();
