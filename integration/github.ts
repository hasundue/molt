import { dirname } from "@std/path";
import { parse as parseJsonc } from "@std/jsonc";
import { match, placeholder as _ } from "@core/match";
import { isString } from "@core/unknownutil";
import { Octokit } from "@octokit/rest";
import { is, type Package } from "./packages.ts";
import type { Repository } from "./repository.ts";

const octokit = new Octokit({
  auth: Deno.env.get("GITHUB_TOKEN"),
});

/**
 * Fetch commit log from the GitHub repository via the GitHub REST API.
 */
export async function compareCommits(
  repo: Repository<"github">,
  base: string,
  head: string,
): Promise<string[]> {
  const { data } = await octokit.repos.compareCommits({
    owner: repo.owner,
    repo: repo.name,
    base,
    head,
  });
  return data.commits.map((it) => it.commit.message);
}

type GitHubContent = {
  path?: string;
  type?: "blob" | "tree";
  sha?: string;
};

export function resolvePackageRoot(
  repo: Repository<"github">,
  pkg: Package,
  ref?: string,
): Promise<string | undefined> {
  switch (pkg.registry) {
    case "jsr":
      return resolveJsrPackageRoot(repo, pkg, ref);
    default:
      throw new Error(`Unsupported registry: ${pkg.registry}`);
  }
}

async function resolveJsrPackageRoot(
  repo: Repository<"github">,
  pkg: Package<"jsr">,
  ref?: string,
): Promise<string | undefined> {
  const contents = await getContents(repo, ref);

  const candidates: GitHubContent[] = [];

  const rootConfig = contents.find((it) =>
    it.path === "deno.json" || it.path === "deno.jsonc"
  );
  if (rootConfig) candidates.push(rootConfig);

  // A heuristic to find the directory for the package
  const moduleConfig = contents.find((it) =>
    it.path === `${pkg.name}/deno.json` || it.path === `${pkg.name}/deno.jsonc`
  );
  if (moduleConfig) candidates.push(moduleConfig);

  for (const config of candidates) {
    if (!config.path || !config.sha) {
      continue;
    }
    const { data } = await octokit.git.getBlob({
      owner: repo.owner,
      repo: repo.name,
      file_sha: config.sha,
    });
    const json = match(
      { name: _("name", isString) },
      parseJsonc(atob(data.content)),
    );
    if (json && is(`jsr:${json.name}`, pkg)) {
      return dirname(config.path);
    }
  }
}

async function getContents(
  repo: Repository<"github">,
  ref?: string,
): Promise<GitHubContent[]> {
  ref = ref ?? await getDefaultRef(repo);

  // Check if the contents are cached in Deno KV
  using kv = await Deno.openKv();
  const entries = await Array.fromAsync(
    kv.list<GitHubContent>({ prefix: ["github", repo.owner, repo.name, ref] }),
  );
  if (entries.length) {
    return entries.map((it) => it.value);
  }

  // Fetch the contents from the GitHub API
  const { data } = await octokit.git.getTree({
    owner: repo.owner,
    repo: repo.name,
    tree_sha: ref,
    recursive: "true",
  });

  // Cache the contents of the repository to Deno KV
  const contents = data.tree as GitHubContent[];
  await Promise.all(
    contents.map((it) =>
      it.path
        ? kv.set(["github", repo.owner, repo.name, ref, it.path], it)
        : undefined
    ),
  );

  return contents;
}

async function getDefaultRef(
  repo: Repository<"github">,
): Promise<string> {
  const { data: meta } = await octokit.repos.get({
    owner: repo.owner,
    repo: repo.name,
  });
  const { data: branch } = await octokit.repos.getBranch({
    owner: repo.owner,
    repo: repo.name,
    branch: meta.default_branch,
  });
  return branch.commit.sha;
}
