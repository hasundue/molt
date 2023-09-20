import { format } from "https://deno.land/std@0.202.0/semver/mod.ts";
import { resolve, toFileUrl } from "https://deno.land/std@0.202.0/path/mod.ts";
import {
  init,
  ModuleJson,
  parseModule,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import {
  parseSemVer,
  removeSemVer,
  replaceSemVer,
  type Specifier,
} from "./src/lib.ts";

class DependencyUpdateSpecifierMap extends Map<Specifier, Specifier> {}

export class DependencyUpdator {
  #specifierMap = new DependencyUpdateSpecifierMap();
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

interface DependencyUpdateJson extends DependencyJson {
  newSpecifier: string;
}

export async function collectDependencyUpdateJson(
  modulePath: string,
): Promise<DependencyUpdateJson[]> {
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

export async function createDependencyUpdateJson(
  dependency: DependencyJson,
): Promise<DependencyUpdateJson | undefined> {
  const specifierWithoutSemVer = removeSemVer(dependency.specifier);
  if (specifierWithoutSemVer === dependency.specifier) {
    // The original specifier does not contain semver
    return undefined;
  }
  const semver = parseSemVer(dependency.specifier)!;
  const response = await fetch(specifierWithoutSemVer, {
    method: "HEAD",
  });
  if (!response.redirected) {
    // The host did not redirect to the latest version
    return undefined;
  }
  const specifierWithNewSemVer = response.url;
  if (specifierWithNewSemVer === dependency.specifier) {
    // The dependency is up to date
    return undefined;
  }
  const newSemVer = parseSemVer(specifierWithNewSemVer)!;
  return {
    ...dependency,
    newSpecifier: dependency.specifier.replace(
      format(semver),
      format(newSemVer),
    ),
  };
}

await init();
