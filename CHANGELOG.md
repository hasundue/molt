# Changelog

## [0.14.0](https://github.com/hasundue/molt/compare/0.13.0...0.14.0) (2023-11-26)


### ⚠ BREAKING CHANGES

* **mod:** merge `execCommitSequence` and `execCommit` into `exec`

### Features

* **lib:** add `lib/entropy.ts` ([236f2df](https://github.com/hasundue/molt/commit/236f2df2bc60d8b8e257fe1b9216828118e9214b))
* support non-semver version specifiers ([c0d3829](https://github.com/hasundue/molt/commit/c0d3829ca08be63c42a96dda52f4366f699cc2a7))


### Performance Improvements

* **lib/testing:** suppress network access to deno.land ([beeb4d4](https://github.com/hasundue/molt/commit/beeb4d4f4e2b5b4171f8fee3203cadbae08092fd))


### Code Refactoring

* **mod:** merge `execCommitSequence` and `execCommit` into `exec` ([4eb27de](https://github.com/hasundue/molt/commit/4eb27dea63a1719d59e6f9dd964d0ccc1f873530))

## [0.13.0](https://github.com/hasundue/molt/compare/0.12.0...0.13.0) (2023-11-25)


### ⚠ BREAKING CHANGES

* **mod,lib:** reorganize module strucutre ([#92](https://github.com/hasundue/molt/issues/92))

### Code Refactoring

* **mod,lib:** reorganize module strucutre ([#92](https://github.com/hasundue/molt/issues/92)) ([450719a](https://github.com/hasundue/molt/commit/450719a0af19fdec97f5c57092d4e6b87f283b7c))

## [0.12.0](https://github.com/hasundue/molt/compare/0.11.3...0.12.0) (2023-11-21)


### Features

* **cli:** add `--ignore` and `--only` options ([a6df7f8](https://github.com/hasundue/molt/commit/a6df7f833b8e43bae8016aee8bdefe29f9a1f8dc))
* **mod:** add `ignore` and `only` options in `collect` ([1b3469b](https://github.com/hasundue/molt/commit/1b3469b113d0ab5d3ad0220e1c9e727587f3d306))

## [0.11.3](https://github.com/hasundue/molt/compare/0.11.2...0.11.3) (2023-11-20)


### Bug Fixes

* **mod:** find outdated dependency correctly when updated one coexists ([5f0a5dc](https://github.com/hasundue/molt/commit/5f0a5dc0fa684a48c5911907bcea51ea0689e999))

## [0.11.2](https://github.com/hasundue/molt/compare/0.11.1...0.11.2) (2023-11-10)


### Bug Fixes

* do not trim EOF on the last line of file ([205b9d4](https://github.com/hasundue/molt/commit/205b9d457ddd0df970cf3c4a0f1dd34c09b0938d))

## [0.11.1](https://github.com/hasundue/molt/compare/0.11.0...0.11.1) (2023-11-09)


### Bug Fixes

* do not update to pre-releases ([#79](https://github.com/hasundue/molt/issues/79)) ([7a2e4bd](https://github.com/hasundue/molt/commit/7a2e4bd371ece7b9d2a11b546522150a00ba048c))
* **mod:** export `writeAll` and other types ([19ff379](https://github.com/hasundue/molt/commit/19ff379b9ad9e7a60017e2f97d54affa93913828))

## [0.11.0](https://github.com/hasundue/molt/compare/0.10.0...0.11.0) (2023-11-07)


### ⚠ BREAKING CHANGES

* **file:** rename `writeAll` to `write`

### Features

* **mod:** `writeAll` ([91502e9](https://github.com/hasundue/molt/commit/91502e964b89d1869a07b3cf209b0606d94c5311))


### Bug Fixes

* **cli:** import lib/testing.ts dynamically ([de089b6](https://github.com/hasundue/molt/commit/de089b6ea5848d612e826ebbf6f21034f128c209))


### Code Refactoring

* **file:** rename `writeAll` to `write` ([664d58c](https://github.com/hasundue/molt/commit/664d58ce05c1401619376facbe44712911b1d578))

## [0.10.0](https://github.com/hasundue/molt/compare/0.9.2...0.10.0) (2023-11-07)


### ⚠ BREAKING CHANGES

* **cli:** abandon subcommands

### Code Refactoring

* **lib:** sort updates in lexicographical order

## [0.9.2](https://github.com/hasundue/molt/compare/0.9.1...0.9.2) (2023-11-04)


### Features

* **cli:** run deno subcommands as tasks ([afd68d6](https://github.com/hasundue/molt/commit/afd68d6d4f02c53fd4a3b7a2b1ac7076fa5dea28))

## [0.9.1](https://github.com/hasundue/molt/compare/0.9.0...0.9.1) (2023-11-03)


### Bug Fixes

* **cli:** do not capitalize commit messages ([0608cd9](https://github.com/hasundue/molt/commit/0608cd92d090d5c355fc07467f43b0383e879642))

## [0.9.0](https://github.com/hasundue/molt/compare/0.8.0...0.9.0) (2023-11-03)


### ⚠ BREAKING CHANGES

* **mod:** critical bug in replacing specifiers

### Bug Fixes

* **mod:** critical bug in replacing specifiers ([86a102f](https://github.com/hasundue/molt/commit/86a102fca8ae1b5e6f243028a99cf2f3fe3f2830))
* **mod:** ignore redirected url without semver ([aaf3239](https://github.com/hasundue/molt/commit/aaf3239dbfcaf322f56677dcce9df904b15d11d2))

## [0.8.0](https://github.com/hasundue/molt/compare/0.7.6...0.8.0) (2023-11-02)


### ⚠ BREAKING CHANGES

* insert latest semver into unversioned deps ([#63](https://github.com/hasundue/molt/issues/63))

### Features

* insert latest semver into unversioned deps ([#63](https://github.com/hasundue/molt/issues/63)) ([6e0a76e](https://github.com/hasundue/molt/commit/6e0a76e6d537b005f944f42b3c399248a6be0f5f))


### Bug Fixes

* **git:** avoid reading files concurrently ([#66](https://github.com/hasundue/molt/issues/66)) ([4f655cf](https://github.com/hasundue/molt/commit/4f655cf3029d1f2e70acb0745ac41f45739c4205))

## [0.7.6](https://github.com/hasundue/molt/compare/0.7.5...0.7.6) (2023-10-24)


### Bug Fixes

* **cli:** ensure lazy resolution of version info ([95ba03d](https://github.com/hasundue/molt/commit/95ba03dc7a29cf6345c022cb503c7680d324df9d))

## [0.7.5](https://github.com/hasundue/molt/compare/0.7.4...0.7.5) (2023-10-23)


### Bug Fixes

* **cli:** run `deno` command via `Deno.Command` rather than dax ([35273d2](https://github.com/hasundue/molt/commit/35273d2a397367b80fc457293f83e3752e11c35a))

## [0.7.4](https://github.com/hasundue/molt/compare/0.7.3...0.7.4) (2023-10-23)


### Bug Fixes

* handle Windows paths correctly ([#53](https://github.com/hasundue/molt/issues/53)) ([9233a03](https://github.com/hasundue/molt/commit/9233a03f406ca452cbe620fae9c0940505eae722))

## [0.7.3](https://github.com/hasundue/deno-molt/compare/0.7.2...0.7.3) (2023-10-22)


### Bug Fixes

* **cli:** normalize prefix to always include a single whitespace ([39c5121](https://github.com/hasundue/deno-molt/commit/39c5121559b1016afae0ac939f22acfbaa1159b5))
* **cli:** require an equals sign for --pre-commit and --post-commit ([8d1a8d2](https://github.com/hasundue/deno-molt/commit/8d1a8d27b027e736e26235f9b7c01dfbef68d805))

## [0.7.2](https://github.com/hasundue/deno-molt/compare/0.7.1...0.7.2) (2023-10-22)


### Bug Fixes

* **cli:** always print post-commit messages ([0ca8789](https://github.com/hasundue/deno-molt/commit/0ca878912c975e302a00761364a7f9067f75ef44))

## [0.7.1](https://github.com/hasundue/deno-molt/compare/0.7.0...0.7.1) (2023-10-22)


### Bug Fixes

* **mod/update:** prevent adding extra characters after import specifiers ([abd521f](https://github.com/hasundue/deno-molt/commit/abd521ff02bfe778f9de88b4c3cd1a736fd033e1))
* **mod:** parse semvers in redirected urls to check updates ([a3771dd](https://github.com/hasundue/deno-molt/commit/a3771dd6fd7e77fbc3767acd23c667247dc01cde))

## [0.7.0](https://github.com/hasundue/deno-molt/compare/0.6.0...0.7.0) (2023-10-22)


### Features

* **cli/update:** add --summary, --report, and --prefix options ([#45](https://github.com/hasundue/deno-molt/issues/45)) ([cc4d630](https://github.com/hasundue/deno-molt/commit/cc4d63025279478a89ac3d499342855ba76064ea))


### Bug Fixes

* **mod:** fix import specifiers ([54e8282](https://github.com/hasundue/deno-molt/commit/54e82821d09bebb1ff058360471cfd9dfde808c6))

## [0.6.0](https://github.com/hasundue/deno-molt/compare/0.5.0...0.6.0) (2023-10-21)


### ⚠ BREAKING CHANGES

* **git:** mv git/mod.ts to src/git.ts and create git.ts

### Bug Fixes

* **git:** respect default CommitOptions correctly ([68d8ffb](https://github.com/hasundue/deno-molt/commit/68d8ffbbb5380cb60f1a68521cd96f8d29250d70))


### Performance Improvements

* cache latest semvers resolved from remote ([#42](https://github.com/hasundue/deno-molt/issues/42)) ([27300ac](https://github.com/hasundue/deno-molt/commit/27300ac3e03d27b8a2803658b119d00303a8a54d))


### Code Refactoring

* **git:** mv git/mod.ts to src/git.ts and create git.ts ([ffc5df4](https://github.com/hasundue/deno-molt/commit/ffc5df4514066f81cac8aedcaddc97133ea35c86))

## [0.5.0](https://github.com/hasundue/deno-molt/compare/0.4.6...0.5.0) (2023-10-16)


### ⚠ BREAKING CHANGES

* **git:** ExecGitCommitSequenceOptions are merged into CommitOptions

### Bug Fixes

* **git:** invoke pre-commit hook after changes are written correctly ([#38](https://github.com/hasundue/deno-molt/issues/38)) ([50c4515](https://github.com/hasundue/deno-molt/commit/50c45159ff50e61f0c4668c2e784d0e52f9544da))


### Code Refactoring

* **git:** ExecGitCommitSequenceOptions are merged into CommitOptions ([50c4515](https://github.com/hasundue/deno-molt/commit/50c45159ff50e61f0c4668c2e784d0e52f9544da))

## [0.4.6](https://github.com/hasundue/deno-molt/compare/0.4.5...0.4.6) (2023-10-08)


### Bug Fixes

* **import_map:** don't crash on empty deno.json ([#34](https://github.com/hasundue/deno-molt/issues/34)) ([451c04e](https://github.com/hasundue/deno-molt/commit/451c04e74e2997b3a0bcc4ccfb5a4ddd2e444d5a))

## [0.4.5](https://github.com/hasundue/deno-molt/compare/0.4.4...0.4.5) (2023-10-02)


### Bug Fixes

* support import maps refereed from deno.json  ([#32](https://github.com/hasundue/deno-molt/issues/32)) ([ef1a1a3](https://github.com/hasundue/deno-molt/commit/ef1a1a335bb7dd63e5f75224e28884ce65808aef))

## [0.4.4](https://github.com/hasundue/deno-molt/compare/0.4.3...0.4.4) (2023-10-02)


### Performance Improvements

* **cli:** make findImportMap async ([#30](https://github.com/hasundue/deno-molt/issues/30)) ([6c1a47c](https://github.com/hasundue/deno-molt/commit/6c1a47c15572452f4252b90830e5578677d4b1e2))

## [0.4.3](https://github.com/hasundue/deno-molt/compare/0.4.2...0.4.3) (2023-10-02)


### Bug Fixes

* **cli:** look for deno.json relative to entrypoints ([#24](https://github.com/hasundue/deno-molt/issues/24)) ([d7301fc](https://github.com/hasundue/deno-molt/commit/d7301fc0696d239490e17f96490380903ed6e1a2))

## [0.4.2](https://github.com/hasundue/deno-molt/compare/0.4.1...0.4.2) (2023-10-01)


### Bug Fixes

* **cli:** exit with error on invalid usage ([#17](https://github.com/hasundue/deno-molt/issues/17)) ([a7d678e](https://github.com/hasundue/deno-molt/commit/a7d678efc137195c719a9bd5f52dca5820933a17))

## [0.4.1](https://github.com/hasundue/deno-molt/compare/0.4.0...0.4.1) (2023-10-01)


### Bug Fixes

* **cli:** show help when invoked with no args ([#16](https://github.com/hasundue/deno-molt/issues/16)) ([d9d507d](https://github.com/hasundue/deno-molt/commit/d9d507d6af228de4b57bc875b3c289e182b43cb0))
* **import_map:** fix TypeError on unmapped url imports ([#22](https://github.com/hasundue/deno-molt/issues/22)) ([2b1c8f3](https://github.com/hasundue/deno-molt/commit/2b1c8f32ac7c21c15ff9e20771fda40c3eab1c11))

## [0.4.0](https://github.com/hasundue/deno-molt/compare/0.3.0...0.4.0) (2023-09-30)


### Features

* **cli:** add pre-commit and post-commit options and prompts to run tasks ([9ce9655](https://github.com/hasundue/deno-molt/commit/9ce965541003f4edbd58816265d4fdf46a5d6508))

## [0.3.0](https://github.com/hasundue/deno-molt/compare/0.2.2...0.3.0) (2023-09-30)


### Features

* **cli:** add an option to CLI for running tests on each commit ([188f8ef](https://github.com/hasundue/deno-molt/commit/188f8ef92fd0a0ef781cd2615b720f972aa12ae5))

## [0.2.2](https://github.com/hasundue/deno-molt/compare/0.2.1...0.2.2) (2023-09-28)


### Bug Fixes

* **cli:** remove unnecessary quotes from commit message ([24e96fc](https://github.com/hasundue/deno-molt/commit/24e96fc3fca39d94c3f4969a69cbbff65ca7ed20))

## [0.2.1](https://github.com/hasundue/deno-molt/compare/0.2.0...0.2.1) (2023-09-28)


### Bug Fixes

* **cli:** parse multiple entrypoints correctly ([aa99b14](https://github.com/hasundue/deno-molt/commit/aa99b14475a8a0ccee7988a64095db4aa29f64b1))

## [0.2.0](https://github.com/hasundue/deno-molt/compare/0.1.1...0.2.0) (2023-09-28)


### ⚠ BREAKING CHANGES

* **mod:** restructure the module completely

### Features

* support import maps ([#7](https://github.com/hasundue/deno-molt/issues/7)) ([f452df3](https://github.com/hasundue/deno-molt/commit/f452df33c44d018761bc138b0cb1706025183421))


### Code Refactoring

* **mod:** restructure the module completely ([f452df3](https://github.com/hasundue/deno-molt/commit/f452df33c44d018761bc138b0cb1706025183421))

## [0.1.1](https://github.com/hasundue/deno-molt/compare/0.1.0...v0.1.1) (2023-09-24)


### Bug Fixes

* **cli:** print commit messages ([1b6b7b8](https://github.com/hasundue/deno-molt/commit/1b6b7b85a31a3aac87f9fdeb0862cbcc1b37312b))
* **cli:** print file names when writing changes ([7e07eb6](https://github.com/hasundue/deno-molt/commit/7e07eb688d72a3ccd29c6d323c6b53f8acc136fb))
