# 🦕 Molt

[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!WARNING]\
> Molt is still being developed actively. The API is not stable yet and may
> change frequently.

Molt is a [Deno] module to bump versions in import specifiers, like [udd], but
with some unique concepts:

**The Deno way** - Molt finds dependencies and checks their latest versions in
the same way as Deno runtime and Deno's official registries do.

**Module-first** - The core logic is provided as a Deno module, which enables
you to write the best scripts for your use cases.

**Git-friendly** - The operations can be easily divided into logical groups for
subsequent git commits.

## Usage

### Deno Module

#### [API Reference](https://deno.land/x/molt/mod.ts)

#### Examples

##### Update all dependencies in a module and write the changes to local files

```ts
import { collect, writeAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";

const updates = await collect("./mod.ts");
await writeAll(updates);
```

##### Update all dependencies in a module and commit the changes to git

```ts
import { collect, commitAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";

const updates = await collect("./mod.ts");

await commitAll(updates, {
  groupBy: (dependency) => dependency.name,
  composeCommitMessage: ({ group, version }) =>
    `build(deps): bump ${group} to ${version!.to}`,
});
```

### CLI

Although it is encouraged to write your own scripts, a pre-built CLI tool is
also provided as `cli.ts` for convenience or a reference implementation, which
is supposed to cover most of the use cases.

#### Installation (optional)

The molt CLI can be installed globally with the following command, for example:

```sh
deno install --allow-env --allow-read --allow-write --allow-net --allow-run=git,deno\
--name molt https://deno.land/x/molt@{VERSION}/cli.ts
```

Alternatively, you may prefer to run the remote script directly through
`deno task` for better security or reproducibility:

```json
{
  "tasks": {
    "update": "deno run --allow-env --allow-read --allow-write=. --allow-run=git,deno --allow-net=deno.land https://deno.land/x/molt@{VERSION}/cli.ts ./**/*.ts",
    "update:commit": "deno task -q update --commit --pre-commit=fmt"
  }
}
```

#### Usage

```
> molt --help
Usage: molt <modules...>

Description:

  Check updates to dependencies in Deno modules

Options:

  -h, --help               - Show this help.                                              
  -v, --version            - Print version info.                                          
  --import-map   <file>    - Specify import map file                                      
  --ignore       <deps>    - Ignore dependencies                                          
  --only         <deps>    - Check specified dependencies                                 
  -w, --write              - Write changes to local files            (Conflicts: --commit)
  -c, --commit             - Commit changes to local git repository  (Conflicts: --write) 
  --pre-commit   <tasks>   - Run tasks before each commit            (Depends: --commit)  
  --post-commit  <tasks>   - Run tasks after each commit             (Depends: --commit)  
  --prefix       <prefix>  - Prefix for commit messages              (Depends: --commit)  
  --summary      <file>    - Write a summary of changes to file                           
  --report       <file>    - Write a report of changes to file                            

Examples:

  Check updates in a module:     molt deps.ts                               
  Include multiple modules:      molt mod.ts lib.ts                         
  Target all .ts files:          molt ./**/*.ts                             
  Specify an import map:         molt mod.ts --import-map deno.json         
  Ignore specific dependencies:  molt deps.ts --ignore=deno_graph,node_emoji
  Only check deno_std:           molt deps.ts --only deno.land/std
```

> [!Note]\
> Molt CLI automatically uses import maps defined in `deno.json` or `deno.jsonc`
> if available.\
> You can't, however, use import maps as entrypoints.

#### Examples

##### Check for updates

```sh
> molt mod.ts 
📦 deno.land/std 0.200.0 => 123.456.789
  lib.ts 0.200.0
  mod.ts 0.200.0

📦 deno.land/x/deno_graph 0.50.0 => 123.456.789
  mod.ts 0.50.0

📦 node-emoji 2.0.0 => 123.456.789
  mod.ts 2.0.0
```

##### Write changes to files

```sh
> molt mod.ts --write
    ...
💾 lib.ts
💾 mod.ts
```

##### Commit changes to git

```sh
> molt mod.ts --commit --pre-commit=test --prefix :package: --summary title.txt --report report.md
    ...
📝 :package: bump deno.land/std from 0.200.0 to 123.456.789
📝 :package: bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
📝 :package: bump node-emoji from 2.0.0 to 123.456.789

📄 title.txt
📄 report.md
```

## Compatibility with registries

We check compatibility with various registries in
[an integration test](./test/integration/registries.ts).

### Deno's official registries

Molt offers first-class support for the following registries, which means that
we may implement registry-specific routines for them:

- [x] [deno.land/std](https://deno.land/std)
- [x] [deno.land/x](https://deno.land/x)
- [x] [npm](https://www.npmjs.com) (via `npm:` specifier)

### Third-party registries

Molt also works with some third-party registries, but we don't add
registry-specific routines for them:

- [ ] [cdn.jsdelivr.net](https://cdn.jsdelivr.net)
- [ ] [cdn.skypack.dev](https://cdn.skypack.dev)
- [ ] [esm.run](https://esm.run)
- [x] [esm.sh](https://esm.sh)
- [ ] [denopkg.com](https://denopkg.com)
- [ ] [ga.jspm.io](https://ga.jspm.io)
- [ ] [pax.deno.dev](https://pax.deno.dev)
- [ ] [raw.githubusercontent.com](https://github.com)
- [x] [unpkg.com](https://unpkg.com)
- [ ] [x.nest.land](https://x.nest.land)

## Limitations

The following limitations are imposed by the design of Molt:

- Dependencies are always updated to the latest versions. No version constraints
  are supported.
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
[deno]: https://github.com/hayd/deno-udd
[issues]: https://github.com/hasundue/molt/issues
