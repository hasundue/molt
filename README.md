# 🦕 Molt

[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!WARNING]\
> Molt is still under active development. The API is not stable yet and may
> change frequently.

Molt is a [Deno] module to bump version strings in import specifiers, like
[udd], but with different design principles:

**The Deno way** - Molt finds dependencies and checks their latest versions in a
consistent way as the Deno runtime, with [deno_graph] and [import_map] crates,
etc.

**Module-first** - The core logic is provided as a Deno module, which enables
you to write the best scripts for your use cases.

**Git-friendly** - The operations can be easily divided into logical groups for
subsequent git commits.

## Features

Molt can check updates to dependencies written in different formats and bump
their versions. URL imports, `npm:` and `jsr:` specifiers are all supported:

> [!IMPORTANT]\
> Molt does NOT bump version ragnges like `1`, `1.x`, `~1.2.3` and `^1.2.3` in
> `npm:` and `jrs:` specifiers, but only updates a lockfile.

#### Import specifiers in ES modules

```diff
- import { assert } from "https://deno.land/std@0.200.0/assert/mod.ts";
+ import { assert } from "https://deno.land/std@0.218.2/assert/mod.ts";
...
```

#### Import maps

```diff
  {
    "imports": {
      "@core/match": "jsr:@core/match@0.1.x",
-     "@std/assert": "jsr:@std/assert@0.200.0",
-     "node-emoji": "npm:node-emoji@2.0.0"
+     "@std/assert": "jsr:@std/assert@0.218.2",
+     "node-emoji": "npm:node-emoji@2.1.3"
    }
  }
```

#### Lock files

> [!WARNING]\
> This is still an experimental feature and may not work as expected. Requires
> Deno v1.41.0 or later.

```diff
  {
    "version": "3",
    "packages": {
      "specifiers": {
-       "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.0",
+       "jsr:@core/match@0.1.x": "jsr:@core/match@0.1.9",
        "npm:ts-toolbelt@9.6.0": "npm:ts-toolbelt@9.6.0"
      },
      "jsr": {
-       "@core/match@0.1.0": {
-         "integrity": "6f1edfca5215735a12aa2dbd920ead331a501eb5e3ad70cba3b9787610c7bfaf",
+       "@core/match@0.1.9": {
+         "integrity": "ceff06cf40212bb720925972a4405bef373efe768690b344ac4fd7ca7189f746",
          "dependencies": [
            "npm:ts-toolbelt@9.6.0"
        ...
```

## Usage

### [@molt/core]

#### [API Reference](https://deno.land/x/molt/mod.ts)

#### Examples

##### Update all dependencies in a module and write the changes to local files

```ts
import { collect, write } from "jsr:@molt/core";

const updates = await collect("./mod.ts");
await write(updates);
```

##### Update all dependencies in a module and commit the changes to git

```ts
import { collect, commit } from "jsr:@molt/core";

const updates = await collect("./mod.ts");

await commit(updates, {
  groupBy: (dependency) => dependency.name,
  composeCommitMessage: ({ group, version }) =>
    `build(deps): bump ${group} to ${version!.to}`,
});
```

### [@molt/cli]

Although it is encouraged to write your own scripts, a pre-built CLI tool is
also provided for convenience or as a reference implementation, which is
supposed to cover most of the use cases.

#### Installation (optional)

The molt CLI can be installed globally with the following command, for example:

```sh
deno install --allow-env --allow-read --allow-write --allow-net --allow-run=git,deno\
--name molt jsr:@molt/cli
```

Alternatively, you may prefer to run the remote script directly through
`deno task` for better security or reproducibility:

```json
{
  "tasks": {
    "update": "deno run --allow-env --allow-read --allow-write=. --allow-run=git,deno --allow-net=jsr.io,registry.npmjs.org jsr:@molt/cli ./*.ts",
    "update:commit": "deno task -q update --commit --pre-commit=fmt,lint"
  }
}
```

#### Usage

```
> molt --help
Usage: molt <modules...>

Description:

  Check updates to dependencies in Deno modules and configuration files

Options:

  -h, --help                 - Show this help.                                                                         
  -v, --version              - Print version info.                                                                     
  --import-map     <file>    - Specify import map file                                                                 
  --ignore         <deps>    - Ignore dependencies                                                                     
  --only           <deps>    - Check specified dependencies                                                            
  -w, --write                - Write changes to local files                        (Conflicts: --commit)               
  -c, --commit               - Commit changes to local git repository              (Conflicts: --write)                
  --pre-commit     <tasks>   - Run tasks before each commit                        (Depends: --commit)                 
  --prefix         <prefix>  - Prefix for commit messages                          (Depends: --commit)                 
  --prefix-lock    <prefix>  - Prefix for commit messages of updating a lock file  (Depends: --commit, --unstable-lock)
  --unstable-lock  [file]    - Enable unstable updating of a lock file
```

> [!Note]\
> Molt CLI automatically finds `deno.json` or `deno.jsonc` in the current
> working directory or its parent directories and uses import maps defined in
> the file if available.

#### Examples

##### Check for updates

```sh
> molt deno.json
📦 @luca/flag 1.0.0 => 1.1.0
📦 deno.land/std 0.200.0 => 0.218.2
📦 deno.land/x/deno_graph 0.50.0 => 0.69.7
📦 node-emoji 2.0.0 => 2.1.3
```

You may specify the modules to check, alternatively:

```sh
> molt main.ts main_test.ts
    ...
```

##### Write changes to files

```sh
> molt deno.json --write
    ...
💾 deno.json
```

##### Commit changes to git

```sh
> molt deno.json --commit --prefix :package:
    ...
📝 :package: bump @luca/flag from 1.0.0 to 1.1.0
📝 :package: bump deno.land/std from 0.200.0 to 0.218.2
📝 :package: bump deno.land/x/deno_graph from 0.50.0 to 0.69.7
📝 :package: bump node-emoji from 2.0.0 to 2.1.3
```

## Compatibility with registries

We check compatibility with various registries in
[an integration test](./test/integration/registries.ts).

### Deno's official registries

Molt offers first-class support for the following registries, which means that
we may implement registry-specific routines for them:

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

## How it works

TBW

## Limitations

The following limitations are imposed by the design of Molt:

- Version constraints on URL imports are not supported.
- Dependencies in import specifiers are only targeted.

See [issues] for other known limitations.

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
[udd]: https://github.com/hayd/deno-udd
[@molt/core]: https://jsr.io/@molt/core
[@molt/cli]: https://jsr.io/@molt/cli
[issues]: https://github.com/hasundue/molt/issues
[dependabot]: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file#versioning-strategy
