import { parse, UpdatedDependency } from "./dependency.ts";
import { toPath } from "./path.ts";
import { distinctBy, mapN } from "./std/collections.ts";
import { DependencyUpdate } from "./update.ts";
import { ensure, is, PredicateType } from "./x/unknownutil.ts";

const isLockFileJson = is.ObjectOf({
  version: is.String,
  packages: is.OptionalOf(is.ObjectOf({
    specifiers: is.RecordOf(is.String, is.String),
    jsr: is.OptionalOf(is.RecordOf(
      is.ObjectOf({
        integrity: is.String,
        dependencies: is.OptionalOf(is.ArrayOf(is.String)),
      }),
      is.String,
    )),
    npm: is.OptionalOf(is.RecordOf(
      is.ObjectOf({
        integrity: is.String,
        dependencies: is.RecordOf(is.String, is.String),
      }),
      is.String,
    )),
  })),
  remote: is.OptionalOf(is.RecordOf(is.String, is.String)),
  workspace: is.OptionalOf(is.ObjectOf({
    dependencies: is.OptionalOf(is.ArrayOf(is.String)),
  })),
});

/**
 * A parsed lockfile JSON object.
 * @example
 * ```ts
 * {
 *   version: "3",
 *   packages: {
 *     specifiers: {
 *       "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.9",
 *       "npm:node-emoji@^2": "npm:node-emoji@2.1.3",
 *       "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0"
 *     },
 *   },
 * }
 */
export type LockFileJson = PredicateType<typeof isLockFileJson>;

/** An object representing a lockfile. */
export interface LockFile {
  /** The path to the lockfile. */
  path: string;
  /** The parsed lockfile JSON object. */
  data: LockFileJson;
}

/** A partial lock for a specific dependency */
export interface LockPart {
  /** The import specifier of the dependency. */
  specifier: string;
  /** The parsed lockfile JSON object. */
  data: LockFileJson;
}

/**
 * Read, parse, and validate a lockfile.
 *
 * @param specifier - The URL or path to the lockfile.
 * @returns The parsed JSON object of the lockfile.
 */
export async function parseLockFileJson(
  specifier: URL | string,
): Promise<LockFileJson> {
  try {
    return ensure(
      JSON.parse(await Deno.readTextFile(specifier)),
      isLockFileJson,
    );
  } catch (cause) {
    throw new Error(`Failed to parse lockfile: ${specifier}`, { cause });
  }
}

/**
 * Read, parse, and validate a lockfile.
 *
 * @param specifier - The URL or path to the lockfile.
 * @returns The parsed `LockFile` object.
 */
export async function parseLockFile(
  specifier: URL | string,
): Promise<LockFile> {
  return {
    path: toPath(specifier),
    data: await parseLockFileJson(specifier),
  };
}

//
// Temporary file management
//
interface TempFile {
  path: string;
  [Symbol.asyncDispose](): Promise<void>;
}

async function createTempFile(): Promise<TempFile> {
  const path = await Deno.makeTempFile();
  return {
    [Symbol.asyncDispose]() {
      return Deno.remove(path);
    },
    path,
  };
}

export class CommandError extends Error {}

/**
 * Create a partial lockfile for the given dependency as a temporary file and returns
 * the parsed LockFile object.
 *
 * The implementation here is quite inefficient. We should rather add a JS interface to
 * the `deno_lockfile` crate.
 *
 * @param dependency - The import specifier of dependency to create a lockfile for.
 * @param locked - If given, the resulting lock has the same version as this.
 * @param lockTo - If given, the resulting lock has the same version as this.
 * @returns A promise to the updated lockfile.
 */
export async function createLockPart(
  dependency: string,
  locked?: LockFile | null,
  lockTo?: string,
): Promise<LockPart> {
  // Create a dummy module that only includes the given dependencies.
  const specifier = lockTo ?? locked?.data.packages?.specifiers[dependency] ??
    dependency;
  await using mod = await createTempFile();
  await Deno.writeTextFile(mod.path, `import "${specifier}";\n`);

  // Create a lockfile for the dummy module.
  await using lock = await createTempFile();
  const { code, stderr } = await new Deno.Command("deno", {
    args: ["cache", "--lock-write", "--lock", lock.path, mod.path],
  }).output();
  if (code !== 0) {
    throw new CommandError(new TextDecoder().decode(stderr));
  }
  return {
    specifier: dependency,
    data: await parseLockFileJson(lock.path),
  };
}

/**
 * Create a new lockfile for each dependency and returns a list of them.
 *
 * @param lockfile - The path to the lockfile.
 * @returns A Promise for the LockFile objects of updated lockfiles.
 */
export async function createLockPartForEach(
  lockfile: LockFile,
  update = true,
): Promise<LockPart[]> {
  return await Promise.all(
    Object.entries(lockfile.data.packages?.specifiers ?? {}).map(
      ([specifier, locked]): Promise<LockPart> =>
        createLockPart(update ? specifier : locked),
    ),
  );
}

/**
 * Collect updates to dependencies in the given lockfile.
 *
 * @param original - The LockFile object for the original lockfile.
 * @param patches - The LockFile objects for dependencies being updated.
 * @returns The collected updates to dependencies.
 */
export async function collectUpdateFromLockFile(
  original: LockFile,
  ...patches: LockPart[]
): Promise<DependencyUpdate<"lockfile">[]> {
  patches = patches.length ? patches : await createLockPartForEach(original);
  return distinctBy(
    patches.flatMap(
      (patch: LockPart) =>
        mapN(
          Object.entries(patch.data.packages?.specifiers ?? {}),
          ([specifier, locking]): DependencyUpdate | undefined => {
            const locked = original.data.packages?.specifiers[specifier];
            if (locked !== locking) {
              return {
                from: locked ? parse(locked) : undefined,
                to: parse(locking) as UpdatedDependency,
                code: {
                  specifier,
                  span: undefined,
                },
                referrer: original.path,
                map: undefined,
              };
            }
          },
        ),
    ),
    (update) => update.to.name,
  ).sort((a, b) => a.to.name.localeCompare(b.to.name));
}
