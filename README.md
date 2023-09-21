# 🦕 Molt

A [Deno] module to update dependencies of Deno projects, using [deno_graph] for dependency resolution and parsing.

## Key Features

- **No regex for imports** - Import statements for dependencies are parsed with the same routine as Deno CLI.
- **No regex for registries** - Latest versions of dependencies are obtained by the module resolution logic of Deno CLI and HTTP redirects by module registries.
- **Module-first** - The core logic is provided as versatile functions in a Deno module, which enables users to write best scripts for their use cases.

## Usage

### Deno Module

[API reference] (WIP)

### CLI

#### Check updates of dependencies

```sh
deno run --allow-env --allow-read --allow-net --allow-write=. --allow-run=git\
https://deno.land/x/molt/cli.ts check <...entrypoints>
```

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

💾 Writing changes...

  src/fixtures/mod.ts
  src/fixtures/lib.ts

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

📝 Committing changes...

  build(deps): update deno.land/std from 0.200.0 to 0.202.0
  build(deps): update deno.land/x/deno_graph from 0.50.0 to 0.55.0
  build(deps): update node-emoji from 1.0.0 to 2.1.0

>
```

<!-- Links -->
[Deno]: https://deno.land
[deno_graph]: https://github.com/denoland/deno_graph
[API reference]: https://deno.land/x/molt
