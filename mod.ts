import {
  init,
  ModuleJson,
  parseModule,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import { resolve, toFileUrl } from "https://deno.land/std@0.201.0/path/mod.ts";
import { removeSemVer } from "./src/lib.ts";

export class DependencyUpdator {
  #specifierMap = new Map<string, string>();
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

type DependencyUpdateJson = DependencyJson & {
  newSpecifier: string;
};

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
  console.log(dependencies);
  await Promise.all(dependencies.map(async (dep) => {
    let url: URL;
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
  console.log(updates);
  return updates;
}

export async function createDependencyUpdateJson(
  dependency: DependencyJson,
): Promise<DependencyUpdateJson | undefined> {
  const specifierWithoutSemVer = removeSemVer(dependency.specifier);
  console.log(specifierWithoutSemVer);
  if (specifierWithoutSemVer === dependency.specifier) {
    return undefined;
  }
  const response = await fetch(specifierWithoutSemVer, {
    method: "HEAD",
  });
  if (!response.redirected) {
    return undefined;
  }
  const resolvedSpecifier = response.url;
  if (resolvedSpecifier === dependency.specifier) {
    // The dependency is up to date
    return undefined;
  }
  return { ...dependency, newSpecifier: resolvedSpecifier };
}

await init();
