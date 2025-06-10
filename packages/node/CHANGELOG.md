## [0.5.0](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.5.0) (2025-06-10)


#### Features

* [Support direct TypeScript test execution with Node.js's Type stripping feature](https://github.com/twada/power-assert-monorepo/pull/22)


#### Breaking Changes

* set Node minimum version to v22.14.0, the version where `findPackageJSON` is introduced ([9d4db06f](https://github.com/twada/power-assert-monorepo/commit/9d4db06f54134ee0e56f132c8063aa21649c4f4f))


### [0.4.2](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.4.2) (2024-12-09)

#### Bug Fixes

  * [fix] fix regression introduced in ec23da61f4 ([329f6d1e](https://github.com/twada/power-assert-monorepo/commit/329f6d1edb8840744dc9478c6b0be521b5e5d9e1))


### [0.4.1](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.4.1) (2024-08-23)

  * [refactor] [rename esm-loader.mts to hooks.mts](https://github.com/twada/power-assert-monorepo/commit/ec23da61f484d18aa508f31b4b8a6964ea8afe11)


## [0.4.0](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.4.0) (2024-08-23)

  * [feat] [Support chaining with other customization hooks](https://github.com/twada/power-assert-monorepo/pull/17)
    * [feat] expose '@power-assert/node/hooks' to support chain of hooks easily
  * [chore] upgrade transpiler to v0.5.0
  * [chore] upgrade runtime to v0.2.1


## [0.3.0](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.3.0) (2024-05-31)


#### Breaking Changes

- Update Node.js version requirement to `>=20.6.0` ([cd618d17](https://github.com/twada/power-assert-monorepo/commit/cd618d1749cad6df954956de00492dfeb9afa397))


## [0.2.0](https://github.com/twada/power-assert-monorepo/releases/tag/node-v0.2.0) (2024-05-20)


#### Features

- [Support node `--import` flag](https://github.com/twada/power-assert-monorepo/pull/8)
- [Rename @power-assert/esm to @power-assert/node](https://github.com/twada/power-assert-monorepo/pull/9)
