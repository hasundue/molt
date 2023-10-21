# 🦕 Molt

Molt is a [Deno] module to bump semvers in import specifiers, focused on
consistency and maintainability. It uses [deno_graph] for dependency resolution,
which enables us to avoid implementing custom logic or regex for each module
registry.

## Key Concepts

- **No regex to detect dependencies** - Import specifiers of dependencies are
  discovered by the same parser as Deno runtime.
- **No custom logic for each registry** - Latest versions of dependencies are
  obtained by redirects of fetch requests by module registries.
- **Module-first** - The core logic is provided as versatile functions in a Deno
  module, which enables you to write the best scripts for your use cases.
- **Git-friendly** - The operations can be easily divided into logical groups
  for subsequent git commits. A submodule and CLI for git operations are also
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

const results = FileUpdate.collect(updates);
FileUpdate.writeAll(results);
```

##### Update all dependencies in a module and commit the changes to local git repository

```ts
import { DependencyUpdate } from "https://deno.land/x/molt@{VERSION}/mod.ts";
import { commitAll } from "https://deno.land/x/molt@{VERSION}/git.ts";

const updates = await DependencyUpdate.collect("./mod.ts");

commitAll(updates, {
  groupBy: (dependency) => dependency.name,
  composeCommitMessage: ({ group, version }) =>
    `build(deps): bump ${group} to ${version!.to}`,
});
```

### CLI

Although it is recommended to write your own scripts with the module, a
pre-built CLI tool is also provided as `cli.ts` for convenience or a reference
implementation, which is supposed to cover most of the use cases.

#### Installation (optional)

The molt CLI can be installed globally with the following command, for example:

```sh
deno install --allow-env --allow-read --allow-write=. --allow-net --allow-run\
--name=molt https://deno.land/x/molt/cli.ts
```

Alternatively, you may prefer to run the remote script directly through
`deno task` for reproducibility:

```sh
{
  "tasks": {
    "run": "deno run --allow-env --allow-read --allow-net",
    "update": "deno task run --allow-write=. https://deno.land/x/molt/cli.ts update",
    "update:check": "deno task run https://deno.land/x/molt/cli.ts check",
    "update:commit": "deno task run --allow-write=. --allow-run=git https://deno.land/x/molt/cli.ts update --commit",
  },
}
```

#### Update dependencies interactively

The most interactive interface is provided as `check` sub-command of `cli.ts`.

```sh
deno run --allow-env --allow-read --allow-net --allow-write=. --allow-run\
https://deno.land/x/molt/cli.ts check --import-map <file> <...entrypoints>
```

> [!Note]\
> Molt CLI automatically uses import maps defined in `deno.json` or `deno.jsonc`
> if available.\
> You can't, however, use import maps as entrypoints.

##### Example: Just check

```
> deno run --allow-env --allow-net --allow-read\
https://deno.land/x/molt/cli.ts check src/fixtures/mod.ts 
🔎 Checking for updates...
💡 Found updates:

📦 node-emoji 1.0.0 => 2.1.0
  src/fixtures/mod.ts 1.0.0

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
> deno run --allow-env --allow-net --allow-read --allow-write=.\
https://deno.land/x/molt/cli.ts check src/fixtures/mod.ts 
🔎 Checking for updates...
💡 Found updates:
    ...

? Choose an action › Write changes to local files

Writing changes...
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
? Tasks to run before each commit (comma separated) › lock, test
? Tasks to run after each commit (comma separated) › 

Committing changes...
📝 build(deps): update deno.land/std from 0.200.0 to 0.202.0
📝 build(deps): update deno.land/x/deno_graph from 0.50.0 to 0.55.0
📝 build(deps): update node-emoji from 1.0.0 to 2.1.0

>
```

#### Update dependencies non-interactively

The `update` sub-command of `cli.ts` is designed to be used in non-interactive
environments, such as CI/CD pipelines.

##### Example: Update dependencies and write changes to files

```sh
deno run --allow-env --allow-read --allow-net --allow-write=.\
https://deno.land/x/molt/cli.ts update <...entrypoints>
```

##### Example: Update dependencies and commit changes to git

```sh
deno run --allow-env --allow-read --allow-net --allow-write=. --allow-run=git\
https://deno.land/x/molt/cli.ts update --commit <...entrypoints>
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
[issues]: https://github.com/hasundue/molt/issues
