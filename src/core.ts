import { ModuleJson } from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import { type Brand, createUrl, type Maybe } from "./utils.ts";
import { parseSemVer } from "./semver.ts";

export type Specifier = Brand<string, "specifier">;

export interface DependencyProps {
  specifier: string;
  name: string;
  version: string;
  path: string;
}

export function parseDependencyProps(
  specifier: string,
): Maybe<DependencyProps> {
  const url = createUrl(specifier);
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
  return { specifier, name, version: semver, path };
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

export interface DependencyUpdateProps extends Omit<DependencyProps, "version"> {
  version: {
    from: string;
    to: string;
  };
  code: NonNullable<DependencyJson["code"]>;
}

export async function createDependencyUpdate(
  dependency: DependencyJson,
  targetVersion?: string,
): Promise<DependencyUpdateProps | undefined> {
  const newSemVer = targetVersion
    ? targetVersion
    : await resolveLatestSemVer(dependency.specifier);
  if (!newSemVer) {
    return;
  }
  const props = parseDependencyProps(dependency.specifier);
  if (!props) {
    return;
  }
  return {
    ...props,
    code: dependency.code!,
    version: {
      from: (props.version),
      to: newSemVer,
    },
  };
}

async function resolveLatestSemVer(
  specifier: string,
): Promise<Maybe<string>> {
  const url = createUrl(specifier);
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
      return latestSemVer;
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
