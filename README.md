# 🦕 Molt

[![JSR](https://jsr.io/badges/@molt)](https://jsr.io/badges/@molt)
[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!IMPORTANT]
> Now Deno has a built-in command to update dependencies (`deno outdated --update`) as of v2.1.\
> It is recommended to use that instead, if you manage your dependencies in `deno.json(c)`.

![demo](https://github.com/user-attachments/assets/119c6a86-8f14-4b0b-81ee-a747bbbe4d3f)

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

> [!NOTE]\
> Molt uses a similar versioning strategy as `increase-if-necessary` in
> `dependabot` to bump version ranges[^1].

## Packages and documentation

### [@molt/cli]

[![JSR](https://jsr.io/badges/@molt/cli)](https://jsr.io/@molt/cli)
[![JSR](https://jsr.io/badges/@molt/cli/score)](https://jsr.io/@molt/cli/score)

A CLI to update dependencies, supposed to be the entry point for most users.

### [@molt/core]

[![JSR](https://jsr.io/badges/@molt/core)](https://jsr.io/@molt/core)
[![JSR](https://jsr.io/badges/@molt/core/score)](https://jsr.io/@molt/core/score)

Deno modules to collect and manipulate dependencies and updates.

### [@molt/integration]

[![JSR](https://jsr.io/badges/@molt/integration)](https://jsr.io/@molt/integration)
[![JSR](https://jsr.io/badges/@molt/integration/score)](https://jsr.io/@molt/integration/score)

Modules to integrate Molt with thrid-party platforms.

### [@molt/lib]

[![JSR](https://jsr.io/badges/@molt/lib)](https://jsr.io/@molt/lib)
[![JSR](https://jsr.io/badges/@molt/lib/score)](https://jsr.io/@molt/lib/score)

General-purpose utilities developed for Molt, but may be used independently.

## Integration

### [molt-action](https://github.com/hasundue/molt-action)

A GitHub Action to create pull requests for dependency updates.

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

## Related projects

Molt is inspired by other projects like

- [deno-udd](https://github.com/hayd/deno-udd)
- [dmm](https://github.com/drashland/dmm)
- [updater](https://github.com/deaddeno/updater)

<!-- Footnotes -->

[^1]: See
[Dependabot's versioning strategy](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#versioning-strategy).

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
