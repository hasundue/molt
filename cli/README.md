## Installation (optional)

The molt CLI can be installed globally with the following command, for example:

```sh
deno install --global -R -W -E -N --allow-run=git,deno -n molt jsr:@molt/cli
```

Alternatively, you may prefer to run the remote script directly through
`deno task` for better security or reproducibility. For example:

```json
{
  "tasks": {
    "update": "deno run --allow-env --allow-read --allow-write='~/.local,.' --allow-run=git,deno --allow-net=jsr.io jsr:@molt/cli",
    "update:commit": "deno task -q update --commit"
  }
}
```

## Usage

```
Usage: molt [source...]

Description:

  Check updates to dependencies in a Deno project.

Options:

  -h, --help                - Show this help.                                                               
  -v, --version             - Print version info.                                                           
  -w, --write               - Write changes to the local files.                        (Conflicts: --commit)
  -c, --commit              - Commit changes to the local git repository.              (Conflicts: --write) 
  --changelog    [types]    - Print commits for each update. (requires --unstable-kv)                       
  --config       <file>     - Specify the Deno configuration file.                                          
  --dry-run                 - See what would happen without actually doing it.                              
  --ignore       <pattern>  - Specify dependencies to ignore.                                               
  --only         <pattern>  - Specify dependencies to check.                                                
  --lock         <file>     - Specify the lock file.                                                        
  --no-config               - Disable automatic loading of the configuration file.                          
  --no-lock                 - Disable automatic loading of the lock file.                                   
  --pre-commit   <tasks>    - Run tasks before each commit                             (Depends: --commit)  
  --prefix       <prefix>   - Prefix for commit messages                               (Depends: --commit)  
  --referrer                - Print files that import the dependency.
```

> [!Note]\
> Molt CLI automatically finds `deno.json` or `deno.jsonc` and `deno.lock` in
> the current working directory.

## Examples

### Check for updates

#### Dependencies manifested in `deno.json` or `deno.jsonc`

```sh
> molt
📦 @conventional-commits/parser 0.3.0 →  0.4.1 (^0.3.0 →  ^0.4.0)
📦 @luca/flag 1.0.0 →  1.0.1
📦 deno.land/std 0.222.0 →  0.224.0
```

You may specify the path to the configuration file explicitly:

```sh
> molt --config deno.json
...
```

Or as an argument (unrecommended):

```sh
> molt deno.json
...
```

#### Dependencies imported directly in Deno modules

```sh
> molt deps.ts
📦 @conventional-commits/parser 0.3.0 →  0.4.1
📦 @luca/flag 1.0.0 →  1.0.1
📦 deno.land/std 0.222.0 →  0.224.0
```

You may omit the arguments and let molt collect dependencies from all modules
under the current directory if you do NOT manifest any dependency in `deno.json`
or `deno.jsonc`:

```sh
> molt
...
```

### Write changes to files

```sh
> molt --write
...
```

### Commit changes to git

```sh
> molt --commit
...
```
