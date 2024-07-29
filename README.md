# 🦕 Molt

[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!WARNING]\
> The project is still under active development. The API is not stable yet and
> may change frequently.

Molt is a project to provide Deno modules and a CLI to manage dependencies in
Deno projects. Inspired by [udd], but built from scratch with different design
principles:

**The Deno way** - Internal logics of the Deno runtime are reused as much as
possible, through the [deno_graph] and [deno_lockfile] crates, etc.

**Module-first** - The core features are provided as Deno modules, which enables
you to write the best scripts for your use cases.

**Git-friendly** - The operations can be easily divided into logical groups for
subsequent git commits.

## Features

Molt can update to dependencies written in different formats. URL imports,
`npm:` and `jsr:` specifiers are all supported:

#### ES modules

```diff
- import { copy } from "https://deno.land/std@0.222.0/bytes/copy.ts";
+ import { copy } from "https://deno.land/std@0.224.0/bytes/copy.ts";
...
```

#### Import maps

```diff
  {
    "imports": {
-     "std/": "https://deno.land/std@0.222.0/",
+     "std/": "https://deno.land/std@0.224.0/",
      "@luca/flag": "jsr:@luca/flag@^1.0.0",
-     "@conventional-commits/parser": "npm:@conventional-commits/parser@^0.3.0"
+     "@conventional-commits/parser": "npm:@conventional-commits/parser@^0.4.0"
    }
  }
```

#### Lock files

```diff
  {
    "version": "3",
    "packages": {
      "specifiers": {
-       "jsr:@luca/flag@^1.0.0": "jsr:@luca/flag@1.0.0",
-       "npm:@conventional-commits/parser@^0.3.0": "npm:@conventional-commits/parser@0.3.0"
+       "jsr:@luca/flag@^1.0.0": "jsr:@luca/flag@1.0.1",
+       "npm:@conventional-commits/parser@^0.3.0": "npm:@conventional-commits/parser@0.4.1"
      },
      "jsr": {
-       "@luca/flag@1.0.0": {
-         "integrity": "1c76cf54839a86d0929a619c61bd65bb73d7d8a4e31788e48c720dbc46c5d546"
+       "@luca/flag@1.0.1": {
+         "integrity": "dce7eb4159b1bdb1606fe05c2e5388dcff5ae3b0b84184b934bc623143742408"
        }
      },
      ...
```

## Packages

### [@molt/cli]

A CLI to check updates to dependencies in Deno modules or a configuration file.

### [@molt/core]

Deno modules to collect and manipulate dependencies and updates.

### [@molt/integration]

Modules to integrate Molt with thrid-party platforms.

### [@molt/lib]

General-purpose utilities developed for Molt, but may be used independently.

## Compatibility with registries

We check compatibility with various registries in
[an integration test](./integration/registries_test.ts).

### Deno's official registries

Molt offers first-class support for the following registries, implementing
registry-specific routines for them:

- [x] [deno.land/std](https://deno.land/std)
- [x] [deno.land/x](https://deno.land/x)
- [x] [jsr](https://jsr.io) (via `jsr:` specifier)
- [x] [npm](https://www.npmjs.com) (via `npm:` specifier)

### Third-party registries

Molt also works with the following third-party registries:

- [x] [esm.sh](https://esm.sh)
- [x] [unpkg.com](https://unpkg.com)

The following registries are not compatible with Molt:

- [cdn.jsdelivr.net](https://cdn.jsdelivr.net)
- [cdn.skypack.dev](https://cdn.skypack.dev)
- [esm.run](https://esm.run)
- [denopkg.com](https://denopkg.com)
- [ga.jspm.io](https://ga.jspm.io)
- [pax.deno.dev](https://pax.deno.dev)
- [raw.githubusercontent.com](https://github.com)
- [x.nest.land](https://x.nest.land)

## References

Molt is inspired by prior works such as

- [deno-udd](https://github.com/hayd/deno-udd)
- [dmm](https://github.com/drashland/dmm)
- [updater](https://github.com/deaddeno/updater)

and of full respect to the authors.

<!-- Links -->

[Deno]: https://deno.land
[deno_graph]: https://github.com/denoland/deno_graph
[import_map]: https://github.com/denoland/import_map
[deno_lockfile]: https://github.com/denoland/deno_lockfile
[udd]: https://github.com/hayd/deno-udd
[@molt/cli]: https://jsr.io/@molt/cli
[@molt/core]: https://jsr.io/@molt/core
[@molt/integration]: https://jsr.io/@molt/integration
[@molt/lib]: https://jsr.io/@molt/lib
[issues]: https://github.com/hasundue/molt/issues
[dependabot]: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#versioning-strategy
