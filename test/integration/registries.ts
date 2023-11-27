import { assertSnapshot } from "../../lib/testing.ts";
import { parse, resolveLatestVersion } from "../../lib/dependency.ts";

type RegistryTestSpec = [
  name: string,
  versioned: string,
  unversioned: string,
];

const SPECS = [
  [
    "deno.land/std",
    "https://deno.land/std@0.200.0/fs/mod.ts",
    "https://deno.land/std/fs/mod.ts",
  ],
] satisfies RegistryTestSpec[];

for (const spec of SPECS) {
  const name = spec[0];

  Deno.test(name, async (t) => {
    const assert = (it: unknown) => assertSnapshot(t, it !== undefined);

    const versioned = parse(spec[1]);

    await assert(versioned.version);
    await assert(await resolveLatestVersion(versioned));
    await assert(await resolveLatestVersion(parse(spec[2])));
  });
}
