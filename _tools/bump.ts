import { associateWith, maxWith } from "@std/collections";
import { compare, format, increment, parse, ReleaseType } from "@std/semver";

type PackageName = "core" | "cli" | "integration" | "lib";

type Config = {
  version: string;
};

const [type, ...pkgs] = Deno.args as [ReleaseType, ...PackageName[]];

const jsons = associateWith(
  pkgs,
  (pkg) => JSON.parse(Deno.readTextFileSync(`./${pkg}/deno.json`)) as Config,
);

const vers = Object.values(jsons).map((json) => json.version).map(parse);
const max = maxWith(vers, compare)!;
const bumped = format(increment(max, type));

for (const [pkg, json] of Object.entries(jsons)) {
  json.version = bumped;
  await Deno.writeTextFile(
    `./${pkg}/deno.json`,
    JSON.stringify(json, null, 2) + "\n",
  );
}

await new Deno.Command("git", {
  args: [
    "commit",
    "-m",
    `chore: release ${bumped}`,
    ...pkgs.map((it) => `${it}/deno.json`),
  ],
  stdout: "inherit",
  stderr: "inherit",
}).output();
