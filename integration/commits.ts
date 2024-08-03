import { getTags, type Repository } from "./repository.ts";
import * as github from "./github.ts";
import { equals, parse } from "@std/semver";

/**
 * Get the commits between two Git references in the repository.
 * If the tags for the specified versions are not found, an empty array is returned.
 *
 * @param repo The repository to fetch the commits from.
 * @param from The version of the dependency to compare from.
 * @param to The version of the dependency to compare to.
 *
 * @returns The commit messages between the two versions.
 */
export async function compareCommits(
  repo: Repository,
  from: string,
  to: string,
): Promise<string[]> {
  //
  // Return the stored commits if available
  //
  using kv = await Deno.openKv();
  const stored = await kv.get<string[]>(
    ["commits", repo.owner, repo.name, from, to],
  );
  if (stored.value) {
    return stored.value;
  }
  //
  // Otherwise, fetch the commits from the Git hosting platform
  //
  const tags = await getTags(repo);
  // Tags and versions not necessarily include the "v" prefix consistently
  const base = tags.find((it) => equals(parse(it), parse(from)));
  const head = tags.find((it) => equals(parse(it), parse(to)));
  if (!base || !head) {
    return [];
  }
  const commits = await _compareCommits(repo, base, head);
  await kv.set(
    ["commits", repo.owner, repo.name, from, to],
    commits,
  );
  return commits;
}

async function _compareCommits(
  repo: Repository,
  base: string,
  head: string,
): Promise<string[]> {
  switch (repo.host) {
    case "github":
      return await github.compareCommits(repo, base, head);
    default:
      throw new Error(`Unsupported Git hosting platform: ${repo.host}`);
  }
}
