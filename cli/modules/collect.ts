import { $ } from "@david/dax";
import { collect, type CollectResult } from "@molt/core";

export default async function (
  entrypoints: string[],
  options: {
    resolve?: boolean;
    ignore?: string[];
    importMap?: string;
    only?: string[];
    unstableLock?: true | string;
  },
): Promise<CollectResult> {
  const result = await $.progress("Checking for updates").with(() =>
    collect(entrypoints, {
      lock: !!options.unstableLock,
      lockFile: typeof options.unstableLock === "string"
        ? options.unstableLock
        : undefined,
      importMap: options.importMap,
      ignore: options.ignore
        ? (dep) => options.ignore!.some((it) => dep.name.includes(it))
        : undefined,
      only: options.only
        ? (dep) => options.only!.some((it) => dep.name.includes(it))
        : undefined,
      resolveLocal: options.resolve,
    })
  );
  if (!result.updates.length) {
    console.log("🍵 No updates found");
    Deno.exit(0);
  }
  return result;
}
