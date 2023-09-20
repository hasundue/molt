import { resolve, toFileUrl } from "https://deno.land/std@0.202.0/path/mod.ts";
import {
  createGraph,
  init as initDenoGraph,
  ModuleJson,
  parseModule,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import {
  type Maybe,
  parseNpmSpecifier,
  parseSemVer,
  removeSemVer,
  replaceSemVer,
} from "./src/lib.ts";
import { parse, SemVer } from "https://deno.land/std@0.202.0/semver/mod.ts";

class DenoGraph {
  static #initialized = false;

  static async ensureInit() {
    if (this.#initialized) {
      return;
    }
    await initDenoGraph();
    this.#initialized = true;
  }
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

interface DependencyUpdateJson extends DependencyJson {
  newSpecifier: string;
}

export async function collectDependencyUpdateJson(
  modulePath: string,
): Promise<DependencyUpdateJson[]> {
  await DenoGraph.ensureInit();
  const specifier = toFileUrl(resolve(modulePath)).href;
  const content = Deno.readTextFileSync(modulePath);
  const { dependencies } = parseModule(specifier, content);
  if (!dependencies) {
    return [];
  }
  const updates: DependencyUpdateJson[] = [];
  await Promise.all(dependencies.map(async (dep) => {
    let url = new URL(dep.specifier);
    try {
      url = new URL(dep.specifier);
    } catch {
      // The specifier is a relative path
      return;
    }
    switch (url.protocol) {
      case "http:":
      case "https:": {
        const update = await createDependencyUpdateJson(dep);
        if (update) {
          updates.push(update);
        }
        return;
      }
      case "npm:": {
        return;
      }
    }
  }));
  return updates;
}

async function resolveLatestSemVer(
  specifier: string,
): Promise<Maybe<SemVer>> {
  let url: URL;
  try {
    url = new URL(specifier);
  } catch {
    // The specifier is a relative path
    return;
  }
  switch (url.protocol) {
    case "npm:": {
      const { name } = parseNpmSpecifier(specifier);
      const response = await fetch(`https://registry.npmjs.org/${name}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch npm registry: ${response.statusText}`);
      }
      const json = await response.json();
      if (!json["dist-tags"]?.latest) {
        throw new Error(`Could not find the latest version of ${name}`);
      }
      return parse(json["dist-tags"].latest);
    }
    case "node:":
    case "file:":
      return;
    case "http:":
    case "https:": {
      const specifierWithoutSemVer = removeSemVer(specifier);
      if (specifierWithoutSemVer === specifier) {
        // The original specifier does not contain semver
        return;
      }
      const response = await fetch(specifierWithoutSemVer, {
        method: "HEAD",
      });
      if (!response.redirected) {
        // The host did not redirect to a url with semver
        return;
      }
      const specifierWithLatestSemVer = response.url;
      if (specifierWithLatestSemVer === specifier) {
        // The dependency is up to date
        return;
      }
      return parseSemVer(specifierWithLatestSemVer)!;
    }
    default:
      // TODO: throw an error?
      return;
  }
}

export async function createDependencyUpdateJson(
  dependency: DependencyJson,
): Promise<Maybe<DependencyUpdateJson>> {
  const newSemVer = await resolveLatestSemVer(dependency.specifier);
  if (!newSemVer) {
    return;
  }
  return {
    ...dependency,
    newSpecifier: replaceSemVer(dependency.specifier, newSemVer),
  };
}
