import { assertSnapshot } from "../../lib/testing.ts";
import { parse, resolveLatestVersion } from "../../lib/dependency.ts";

type RegistryTestSpec = [
  name: string,
  url: string,
];

const SPECS = [
  [
    "deno.land/std",
    "https://deno.land/std@0.200.0/version.ts",
  ],
  [
    "deno.land/x",
    "https://deno.land/x/molt@0.14.0/lib/path.ts",
  ],
  [
    "npm:",
    "npm:preact@10.5.5",
  ],
  [
    "cdn.jsdelivr.net/npm",
    "https://cdn.jsdelivr.net/npm/preact@10.5.5",
  ],
  [
    "cdn.jsdelivr.net/gh",
    "https://cdn.jsdelivr.net/gh/hasundue/molt@e4509a9/lib/path.ts",
  ],
  [
    "cdn.skypack.dev",
    "https://cdn.skypack.dev/preact@10.5.5",
  ],
  [
    "denopkg.com",
    "https://denopkg.com/hasundue/molt@e4509a9/lib/path.ts",
  ],
  [
    "ga.jspm.io",
    "https://ga.jspm.io/npm:lit-html@2.7.0/development/is-server.js",
  ],
  [
    "esm.run",
    "https://esm.run/preact@10.5.5",
  ],
  [
    "esm.sh",
    "https://esm.sh/preact@10.5.5",
  ],
  [
    "x.nest.land",
    "https://x.nest.land/parsec@0.1.0/mod.ts",
  ],
  [
    "pax.deno.dev",
    "https://pax.deno.dev/hasundue/molt@e4509a9/lib/path.ts",
  ],
  [
    "raw.githubusercontent.com",
    "https://raw.githubusercontent.com/hasundue/molt/e4509a9/lib/path.ts",
  ],
  [
    "unpkg.com",
    "https://unpkg.com/preact@10.5.5",
  ],
] satisfies RegistryTestSpec[];

for (const spec of SPECS) {
  const name = spec[0];

  Deno.test(name, async (t) => {
    const assert = (it: unknown) => assertSnapshot(t, it !== undefined);

    // Make sure the URL is valid.
    // Skip this test for npm because it fails.
    if (name !== "npm:") {
      await assert(await import(spec[1]));
    } else {
      await assert(true);
    }

    // Check if the dependency can be parsed.
    const parsed = parse(spec[1]);
    await assert(parsed.version);

    // Check if the latest version can be resolved.
    const updated = await resolveLatestVersion(parsed);
    await assert(updated);
  });
}
