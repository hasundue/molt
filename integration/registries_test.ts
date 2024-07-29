import { tryParse } from "@molt/core/specs";
import { get as getUpdate } from "@molt/core/updates";
import { assertEquals, assertFalse } from "@std/assert";

type RegistryTestSpec = [
  name: string,
  url: string,
  updatable: boolean,
];

const SPECS = [
  [
    "deno.land/std",
    "https://deno.land/std@0.200.0/version.ts",
    true,
  ],
  [
    "deno.land/x",
    "https://deno.land/x/molt@0.14.0/lib/path.ts",
    true,
  ],
  [
    "npm:",
    "npm:preact@10.19.0",
    true,
  ],
  [
    "jsr:",
    "jsr:@std/jsonc@0.210.0",
    true,
  ],
  [
    "jsr.io",
    "https://jsr.io/@molt/core/0.18.4/mod.ts",
    false,
  ],
  [
    "cdn.jsdelivr.net/npm",
    "https://cdn.jsdelivr.net/npm/preact@10.19.0",
    false,
  ],
  [
    "cdn.jsdelivr.net/gh",
    "https://cdn.jsdelivr.net/gh/hasundue/molt@8a4a9a7/lib/path.ts",
    false,
  ],
  [
    "cdn.skypack.dev",
    "https://cdn.skypack.dev/canvas-confetti@1.9.0",
    false,
  ],
  [
    "ga.jspm.io",
    "https://ga.jspm.io/npm:lit-html@2.7.0/development/is-server.js",
    false,
  ],
  [
    "esm.run",
    "https://esm.run/preact@10.19.0",
    false,
  ],
  [
    "esm.sh",
    "https://esm.sh/preact@10.19.0",
    true,
  ],
  [
    "x.nest.land",
    "https://x.nest.land/parsec@0.1.0/mod.ts",
    false,
  ],
  [
    "pax.deno.dev",
    "https://pax.deno.dev/hasundue/molt@8a4a9a7/lib/path.ts",
    false,
  ],
  [
    "raw.githubusercontent.com",
    "https://raw.githubusercontent.com/hasundue/molt/8a4a9a7/lib/path.ts",
    false,
  ],
  [
    "unpkg.com",
    "https://unpkg.com/preact@10.19.0",
    true,
  ],
] satisfies RegistryTestSpec[];

Deno.test("registries", async (t) => {
  for (const spec of SPECS) {
    await t.step("registry - " + spec[0], async () => {
      const dep = tryParse(spec[1]);
      if (!dep) {
        return assertFalse(spec[2]);
      }
      const updated = await getUpdate(dep);
      assertEquals(!!updated, spec[2], Deno.inspect(updated));
    });
  }
});
