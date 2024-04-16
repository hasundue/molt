import { relative } from "@std/path";

import { CollectResult, write } from "@molt/core";

export default async function (
  result: CollectResult,
): Promise<void> {
  console.log();
  await write(result, {
    onWrite: (file) => console.log(`💾 ${relative(Deno.cwd(), file.path)}`),
  });
}
