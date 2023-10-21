import { DependencyUpdate } from "./update.ts";
import { URI } from "./uri.ts";

export interface FileUpdate {
  /** The specifier of the updated dependency (a remote module.) */
  specifier: URI<"file">;
  /** The updated content of the module. */
  content: string;
  /** The dependency updates in the module. */
  dependencies: DependencyUpdate[];
}

export const FileUpdate = {
  collect,
  write,
  writeAll,
};

function collect(
  dependencies: DependencyUpdate[],
): FileUpdate[] {
  /** A map of module specifiers to the module content updates. */
  const results = new Map<URI<"file">, FileUpdate>();
  for (const dependency of dependencies) {
    const referrer = dependency.map?.source ?? dependency.referrer;
    const current = results.get(referrer) ?? {
      specifier: referrer,
      content: Deno.readTextFileSync(new URL(referrer)),
      dependencies: [],
    } satisfies FileUpdate;
    const content = dependency.map
      ? DependencyUpdate.applyToImportMap(dependency, current.content)
      : DependencyUpdate.applyToModule(dependency, current.content);
    results.set(referrer, {
      specifier: current.specifier,
      content,
      dependencies: current.dependencies.concat(dependency),
    });
  }
  return Array.from(results.values());
}

export function writeAll(
  updates: FileUpdate[],
  options?: {
    onWrite?: (result: FileUpdate) => void;
  },
): void {
  updates.forEach((it) => {
    write(it);
    options?.onWrite?.(it);
  });
}

export function write(
  result: FileUpdate,
): void {
  Deno.writeTextFileSync(new URL(result.specifier), result.content);
}
