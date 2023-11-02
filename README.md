# 🦕 Molt

[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!WARNING]\
> Molt is still being developed actively. The API is not stable yet and may
> change frequently.

Molt is a [Deno] module to bump semvers in import specifiers, like
[udd][deno-udd], but with a few different goals:

**Consistent** - Molt uses [deno_graph] for dependency resolution, and
"exploits" redirects of fetch requests, to get latest semvers. This should make
it support as many module registries as Deno runtime does, with a minimum
maintenance cost.

**Module-first** - The core logic is provided as versatile functions in a Deno
module, which enables you to write the best scripts for your use cases.

**Git-friendly** - The operations can be easily divided into logical groups for
subsequent git commits. A submodule and CLI for git operations are also
provided.

## Usage

### Deno Module

#### API Reference (WIP)

- [mod.ts](https://deno.land/x/molt/mod.ts) - Main module
- [git.ts](https://deno.land/x/molt/git.ts) - Sub-module for Git operations
- [lib/uri.ts](https://deno.land/x/molt/lib/uri.ts) - Library for handling URIs

#### Examples

##### Update all dependencies in a module and write the changes to local files

```ts
import {
  DependencyUpdate,
  FileUpdate,
} from "https://deno.land/x/molt@{VERSION}/mod.ts";

const updates = await DependencyUpdate.collect("./mod.ts", {
  importMap: "./deno.json",
});

const results = await FileUpdate.collect(updates);
await FileUpdate.writeAll(results);
```

##### Update all dependencies in a module and commit the changes to local git repository

```ts
import { DependencyUpdate } from "https://deno.land/x/molt@{VERSION}/mod.ts";
import { commitAll } from "https://deno.land/x/molt@{VERSION}/git.ts";

const updates = await DependencyUpdate.collect("./mod.ts");

await commitAll(updates, {
  groupBy: (dependency) => dependency.name,
  composeCommitMessage: ({ group, version }) =>
    `build(deps): bump ${group} to ${version!.to}`,
});
```

### CLI

Although we encourage you to write your own scripts, a pre-built CLI tool is
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

```sh
{
  "tasks": {
    "run:molt": "deno run --allow-env --allow-read --allow-write=. --allow-run=git,deno --allow-net=deno.land https://deno.land/x/molt@{VERSION}/cli.ts",
    "update": "deno task -q run:molt check ./**/*.ts",
    "update:commit": "deno task -q run:molt update --commit --pre-commit=test ./**/*.ts"",
  },
}
```

#### Update dependencies interactively

The most interactive interface is provided as `check` sub-command of `cli.ts`.
Run `molt check --help` for more details.

```sh
molt check [...options] <...entrypoints>
```

> [!Note]\
> Molt CLI automatically uses import maps defined in `deno.json` or `deno.jsonc`
> if available.\
> You can't, however, use import maps as entrypoints.

##### Example: Just check

```
> molt check test/fixtures/direct-import/mod.ts 
🔎 Checking for updates...
💡 Found updates:

📦 node-emoji 1.0.0 => 2.1.0
  test/fixtures/mod.ts 1.0.0

📦 deno.land/x/deno_graph 0.50.0 => 0.55.0
  src/fixtures/mod.ts 0.50.0

📦 deno.land/std 0.200.0 => 0.202.0
  src/fixtures/mod.ts 0.200.0
  src/fixtures/lib.ts 0.200.0

? Choose an action › Abort

>
```

##### Example: Write changes to files

```
> molt check test/fixtures/direct-import/mod.ts 
🔎 Checking for updates...
💡 Found updates:
    ...

? Choose an action › Write changes to local files

💾 src/fixtures/mod.ts
💾 src/fixtures/lib.ts

>
```

##### Example: Commit changes to git

```
> deno run --allow-env --allow-net --allow-read --allow-write=. --allow-run=git\
https://deno.land/x/molt/cli.ts check src/fixtures/mod.ts 
🔎 Checking for updates...
💡 Found updates:
    ...

? Choose an action › Commit changes to git
? Prefix for commit messages (build(deps):) › build(deps):
? Tasks to run before each commit (comma separated) › lock, test
? Tasks to run after each commit (comma separated) › 

📝 build(deps): update deno.land/std from 0.200.0 to 0.202.0
📝 build(deps): update deno.land/x/deno_graph from 0.50.0 to 0.55.0
📝 build(deps): update node-emoji from 1.0.0 to 2.1.0

>
```

#### Update dependencies non-interactively

The `update` sub-command of `cli.ts` is designed to be used in non-interactive
environments, such as CI/CD pipelines. Run `molt update --help` for more
details.

##### Example: Update dependencies and write changes to files

```sh
molt update <...entrypoints>
```

##### Example: Update dependencies and commit changes to git

```sh
molt update --commit --pre-commit=check,test <...entrypoints>
```

## Limitations

The following limitations are imposed by the design of Molt:

- Dependencies are always updated to the latest version. No version constraints
  are supported.
- Dependencies in import specifiers are only targeted.

See [issues] for other known limitations.

## References

Molt is inspired by prior works such as

- [deno-udd](https://github.com/hayd/deno-udd)
- [dmm](https://github.com/drashland/dmm)
- [update](https://github.com/deaddeno/update)

and of full respect to the authors.

<!-- Links -->

[Deno]: https://deno.land
[deno_graph]: https://github.com/denoland/deno_graph
[deno-udd]: https://github.com/hayd/deno-udd
[issues]: https://github.com/hasundue/molt/issues
