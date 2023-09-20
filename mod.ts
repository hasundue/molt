import {
  fromFileUrl,
  resolve,
  toFileUrl,
} from "https://deno.land/std@0.202.0/path/mod.ts";
import {
  createGraph,
  CreateGraphOptions,
  init as initDenoGraph,
  load as defaultLoad,
  ModuleJson,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import {
  createUrl,
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

export interface DependencyUpdateJson extends DependencyJson {
  newSpecifier: string;
}

export interface ModuleUpdateJson extends DependencyUpdateJson {
  referrer: string;
}

export interface CollectDependencyUpdateJsonOptions {
  loadRemote?: boolean;
}

export async function collectModuleUpdateJsonAll(
  modulePath: string,
  options: CollectDependencyUpdateJsonOptions = {
    loadRemote: false,
  },
): Promise<ModuleUpdateJson[]> {
  await DenoGraph.ensureInit();
  const specifier = toFileUrl(resolve(modulePath)).href;
  const graph = await createGraph(specifier, {
    load: createLoadCallback(options),
  });
  const updates: ModuleUpdateJson[] = [];
  await Promise.all(
    graph.modules.map((module) =>
      Promise.all(
        module.dependencies?.map(async (dependency) => {
          const update = await createDependencyUpdateJson(dependency);
          return update
            ? updates.push({ ...update, referrer: module.specifier })
            : undefined;
        }) ?? [],
      )
    ),
  );
  return updates;
}

function createLoadCallback(
  options: CollectDependencyUpdateJsonOptions,
): CreateGraphOptions["load"] {
  // deno-lint-ignore require-await
  return async (specifier) => {
    const url = createUrl(specifier);
    if (!url) {
      throw new Error(`Invalid specifier: ${specifier}`);
    }
    switch (url.protocol) {
      case "node:":
      case "npm:":
        return {
          kind: "external",
          specifier,
        };
      case "http:":
      case "https:":
        if (options.loadRemote) {
          return defaultLoad(specifier);
        }
        return {
          kind: "external",
          specifier,
        };
      default:
        return defaultLoad(specifier);
    }
  };
}

export async function createDependencyUpdateJson(
  dependency: DependencyJson,
  targetVersion?: SemVer | string,
): Promise<DependencyUpdateJson | undefined> {
  const newSemVer = targetVersion
    ? parse(targetVersion)
    : await resolveLatestSemVer(dependency.specifier);
  if (!newSemVer) {
    return;
  }
  return {
    ...dependency,
    newSpecifier: replaceSemVer(dependency.specifier, newSemVer),
  };
}

async function resolveLatestSemVer(
  specifier: string,
): Promise<Maybe<SemVer>> {
  const url = createUrl(specifier);
  if (!url) {
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
      await response.arrayBuffer();
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

export interface ModuleUpdateResult {
  referrer: string;
  specifier: string;
  newSpecifier: string;
  content: string;
}

export async function execModuleUpdateJsonAll(
  updates: ModuleUpdateJson[],
): Promise<ModuleUpdateResult[]> {
  const results: ModuleUpdateResult[] = [];
  await Promise.all(updates.map(async (update) => {
    const result = await execModuleUpdateJson(update);
    return result ? results.push(result) : undefined;
  }));
  return results;
}

export async function execModuleUpdateJson(
  update: ModuleUpdateJson,
): Promise<ModuleUpdateResult | undefined> {
  if (!update.code) {
    return;
  }
  if (update.code.span.start.line !== update.code.span.end.line) {
    throw new Error(
      `The import specifier ${update.specifier} in ${update.referrer} is not a single line`,
    );
  }
  const line = update.code.span.start.line;
  const content = await Deno.readTextFile(fromFileUrl(update.referrer));
  const lines = content.split("\n");
  lines[line] = lines[line].slice(0, update.code.span.start.character) +
    `"${update.newSpecifier}"` + lines[line].slice(update.code.span.end.character);
  return {
    referrer: update.referrer,
    specifier: update.specifier,
    newSpecifier: update.newSpecifier,
    content: lines.join("\n"),
  };
}
