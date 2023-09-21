import { ModuleJson } from "https://deno.land/x/deno_graph@0.55.0/mod.ts";
import { createUrl, type Maybe, parseSemVer } from "./utils.ts";

// Ref: https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER_REGEXP =
  /@v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/g;

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
  const match = body.match(SEMVER_REGEXP);
  if (!match) {
    // The specifier does not contain a semver.
    return;
  }
  const name = body.split(match[0])[0];
  const path = body.slice(name.length + match[0].length);
  return { specifier, name, version: match[0].slice(1), path };
}

type DependencyJson = NonNullable<ModuleJson["dependencies"]>[number];

export interface DependencyUpdate extends Omit<DependencyProps, "version"> {
  version: {
    from: string;
    to: string;
  };
  code: NonNullable<DependencyJson["code"]>;
}

export async function createDependencyUpdate(
  dependency: DependencyJson,
  targetVersion?: string,
): Promise<DependencyUpdate | undefined> {
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
      return json["dist-tags"].latest;
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
