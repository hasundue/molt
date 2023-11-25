# 🦕 Molt

[![CI](https://github.com/hasundue/molt/actions/workflows/ci.yml/badge.svg)](https://github.com/hasundue/molt/actions/workflows/ci.yml)
[![codecov](https://codecov.io/github/hasundue/molt/graph/badge.svg?token=NhpMdDRNxy)](https://codecov.io/github/hasundue/molt)

> [!WARNING]\
> Molt is still being developed actively. The API is not stable yet and may
> change frequently.

Molt is a [Deno] module to bump versions in import specifiers, like
[udd][deno-udd], but with a few different goals:

**Consistent** - Molt uses [deno_graph] for dependency resolution, and utilizes
fetch redirects for unversioned dependencies to get latest versions. This should
make it support as many module registries as Deno runtime does, with a minimum
maintenance cost.

**Module-first** - The core logic is provided as versatile functions in a Deno
module, which enables you to write the best scripts for your use cases.

**Git-friendly** - The operations can be easily divided into logical groups for
subsequent git commits. A submodule and CLI for git operations are also
provided.

## Usage

### Deno Module

#### [API Reference](https://deno.land/x/molt/mod.ts)

#### Examples

##### Update all dependencies in a module and write the changes to local files

```ts
import { collect, writeAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";

const updates = await collect("./mod.ts", { importMap: "./deno.json" });

await writeAll(updates, {
  onWrite: (file) => console.log(`💾 ${file.specifier}`),
});
```

##### Update all dependencies in a module and commit the changes to local git repository

```ts
import { collect, commitAll } from "https://deno.land/x/molt@{VERSION}/mod.ts";

const updates = await collect("./mod.ts", { findImportMap: true });

await commitAll(updates, {
  groupBy: (dependency) => dependency.name,
  composeCommitMessage: ({ group, version }) =>
    `build(deps): bump ${group} to ${version!.to}`,
  postCommit: (commit) => console.log(commit.message),
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
    "update:commit": "deno task -q update --commit --pre-commit=fmt,lint,test"
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
  -w, --write              - Write changes to local files                               
  -c, --commit             - Commit changes to local git repository                     
  --pre-commit   <tasks>   - Run tasks before each commit            (Depends: --commit)
  --post-commit  <tasks>   - Run tasks after each commit             (Depends: --commit)
  --prefix       <prefix>  - Prefix for commit messages              (Depends: --commit)
  --summary      <file>    - Write a summary of changes to file                         
  --report       <file>    - Write a report of changes to file
```

> [!Note]\
> Molt CLI automatically uses import maps defined in `deno.json` or `deno.jsonc`
> if available.\
> You can't, however, use import maps as entrypoints.

#### Examples

##### Check for updates

```sh
> molt mod.ts 
💡 Found updates:

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
💡 Found updates:
    ...

💾 lib.ts
💾 mod.ts
```

##### Commit changes to git

```sh
> molt mod.ts --commit --pre-commit=test --prefix :package: --summary title.txt --report report.md
💡 Found updates:
    ...

📝 :package: bump deno.land/std from 0.200.0 to 123.456.789
📝 :package: bump deno.land/x/deno_graph from 0.50.0 to 123.456.789
📝 :package: bump node-emoji from 2.0.0 to 123.456.789
```

## Limitations

The following limitations are (currently) imposed by the design of Molt:

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
