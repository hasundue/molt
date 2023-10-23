# Changelog

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
