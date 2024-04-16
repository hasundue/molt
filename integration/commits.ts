import type { Repository } from "./repository.ts";
import * as github from "./github.ts";

/**
 * Get the commits between two Git references in the repository.
 */
export async function compareCommits(
  repo: Repository,
  base: string,
  head: string,
): Promise<string[]> {
  //
  // Return the stored commits if available
  //
  using kv = await Deno.openKv();
  const stored = await kv.get<string[]>([
    "commits",
    repo.owner,
    repo.name,
    base,
    head,
  ]);
  if (stored.value) {
    return stored.value;
  }
  //
  // Otherwise, fetch the commits from the Git hosting platform
  //
  const commits = await _compareCommits(repo, base, head);
  await kv.set(
    [
      "commits",
      repo.owner,
      repo.name,
      base,
      head,
    ],
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
