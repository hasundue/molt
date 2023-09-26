import {
  CreateGraphOptions,
  load as defaultLoad,
  ModuleJson,
} from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import type {
  DependencySpecifier,
  FilePath,
  Maybe,
  ModuleSpecifier,
  RelativePath,
  SemVerString,
  UrlString,
} from "./types.ts";
import {
  isFileSpecifier,
  toRelativePath,
  toUrlString,
  tryCreateUrl,
} from "./utils.ts";
import { parseSemVer } from "./semver.ts";
import { ImportMap, readFromJson } from "./import_map.ts";

export function createLoad(
  options?: {
    loadRemote?: boolean;
  },
): NonNullable<CreateGraphOptions["load"]> {
  return async (specifier) => {
    const url = tryCreateUrl(specifier);
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
        if (options?.loadRemote) {
          return await defaultLoad(specifier);
        }
        return {
          kind: "external",
          specifier,
        };
      default:
        return await defaultLoad(specifier);
    }
  };
}

export async function createResolve(
  options?: {
    importMap?: FilePath;
  },
): Promise<CreateGraphOptions["resolve"]> {
  if (!options?.importMap) {
    return undefined;
  }
  const importMap = await readFromJson(options.importMap);
  return (specifier, referrer) => {
    return importMap.tryResolve(specifier, referrer as ModuleSpecifier)
      ?.specifier ?? specifier;
  };
}

export interface DependencyProps {
  name: string;
  version: SemVerString;
  path: RelativePath;
}

export function parseDependencyProps(
  specifier: DependencySpecifier,
): Maybe<DependencyProps> {
  const url = tryCreateUrl(specifier);
  if (!url) {
    // The specifier is a relative path
    return;
  }
  const body = url.hostname + url.pathname;
  const semver = parseSemVer(specifier);
  if (!semver) {
    // The specifier does not contain a semver.
    return;
  }
  const atSemver = "@" + semver;
  const name = body.split(atSemver)[0];
  const path = body.slice(name.length + atSemver.length);
  return { name, version: semver, path: path as RelativePath };
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

export interface DependencyUpdate extends Omit<DependencyProps, "version"> {
  /** The fully resolved specifier of the dependency. */
  specifier: DependencySpecifier;
  version: {
    from: SemVerString;
    to: SemVerString;
  };
  /** The code of the dependency. */
  code: {
    /** The original specifier of the dependency appeared in the code. */
    specifier: DependencySpecifier;
    span: NonNullable<DependencyJson["code"]>["span"];
  };
  /** The relative path to the module from the current working directory. */
  referrer: RelativePath | UrlString;
  /** The path to the import map used to resolve the dependency. */
  importMap?: FilePath;
}

export interface CreateDependencyUpdateOptions {
  /** The path to the json including import maps. */
  importMap?: ImportMap;
}

export async function createDependencyUpdate(
  dependency: DependencyJson,
  referrer: ModuleSpecifier,
  options?: CreateDependencyUpdateOptions,
): Promise<DependencyUpdate | undefined> {
  if (!dependency?.code?.specifier) {
    console.warn(
      `The dependency ${dependency.specifier} has no resolved specifier.`,
    );
    return;
  }
  const newSemVer = await resolveLatestSemVer(
    dependency.code.specifier as DependencySpecifier,
  );
  if (!newSemVer) {
    return;
  }
  const props = parseDependencyProps(
    dependency.code.specifier as DependencySpecifier,
  );
  if (!props) {
    return;
  }
  const mapped = !!options?.importMap?.tryResolve(
    dependency.specifier,
    referrer,
  );
  return {
    ...props,
    // We prefer to put the fully resolved specifier here.
    specifier: dependency.code.specifier as DependencySpecifier,
    code: {
      // We prefer to put the original specifier here.
      specifier: dependency.specifier as DependencySpecifier,
      span: dependency.code.span,
    },
    version: {
      from: props.version as SemVerString,
      to: newSemVer as SemVerString,
    },
    referrer: isFileSpecifier(referrer)
      ? toRelativePath(referrer)
      : toUrlString(referrer),
    importMap: mapped ? options!.importMap!.path : undefined,
  };
}

async function resolveLatestSemVer(
  specifier: DependencySpecifier,
): Promise<Maybe<SemVerString>> {
  const url = tryCreateUrl(specifier);
  if (!url) {
    // The specifier is a relative path
    return;
  }
  const props = parseDependencyProps(specifier);
  if (!props) {
    // The specifier is does not contain a semver.
    return;
  }
  switch (url.protocol) {
    case "npm:": {
      const response = await fetch(
        `https://registry.npmjs.org/${props.name}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch npm registry: ${response.statusText}`);
      }
      const json = await response.json();
      if (!json["dist-tags"]?.latest) {
        throw new Error(
          `Could not find the latest version of ${props.name} from registry.`,
        );
      }
      const latestSemVer: string = json["dist-tags"].latest;
      if (latestSemVer === props.version) {
        // The dependency is up to date
        return;
      }
      return latestSemVer as SemVerString;
    }
    case "http:":
    case "https:": {
      const response = await fetch(
        url.protocol + "//" + props.name + props.path,
        { method: "HEAD" },
      );
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
      return parseSemVer(specifierWithLatestSemVer);
    }
    case "node:":
    case "file:":
      return;
    default:
      // TODO: throw an error?
      return;
  }
}
