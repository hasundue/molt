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
  [
    "deno.land/x",
    "https://deno.land/x/molt@0.1.0/mod.ts",
    "https://deno.land/x/molt/mod.ts",
  ],
  [
    "npm:",
    "npm:typescript@4.1.2",
    "npm:typescript",
  ],
  [
    "cdn.jsdelivr.net/gh",
    "https://cdn.jsdelivr.net/gh/hasundue/molt@e4509a9/mod.ts",
    "https://cdn.jsdelivr.net/gh/hasundue/molt/mod.ts",
  ],
  [
    "cdn.jsdelivr.net/npm",
    "https://cdn.jsdelivr.net/npm/react@16.7.0",
    "https://cdn.jsdelivr.net/npm/react",
  ],
  [
    "cdn.skypack.dev",
    "https://cdn.skypack.dev/preact@10.5.5",
    "https://cdn.skypack.dev/preact",
  ],
  [
    "denopkg.com",
    "https://denopkg.com/hasundue/molt@0.1.0/mod.ts",
    "https://denopkg.com/hasundue/molt/mod.ts",
  ],
  [
    "dev.jspm.io",
    "https://dev.jspm.io/npm:react@16.7.0",
    "https://dev.jspm.io/npm:react",
  ],
  [
    "esm.run",
    "https://esm.run/d3@7.8.0",
    "https://esm.run/d3",
  ],
  [
    "esm.sh",
    "https://esm.sh/react@16.7.0",
    "https://esm.sh/react",
  ],
  [
    "x.nest.land",
    "https://x.nest.land/parsec@0.1.0/mod.ts",
    "https://x.nest.land/parsec/mod.ts",
  ],
  [
    "pax.deno.dev",
    "https://pax.deno.dev/hasundue/molt@0.1.0/mod.ts",
    "https://pax.deno.dev/hasundue/molt/mod.ts",
  ],
  [
    "raw.githubusercontent.com",
    "https://raw.githubusercontent.com/hasundue/molt/e4509a9/mod.ts",
    "https://raw.githubusercontent.com/hasundue/molt/main/mod.ts",
  ],
  [
    "unpkg.com",
    "https://unpkg.com/react@16.7.0/umd/react.production.min.js",
    "https://unpkg.com/react/umd/react.production.min.js",
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
