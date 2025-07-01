## [0.8.0](https://github.com/twada/power-assert-monorepo/releases/tag/swc-plugin-power-assert-v0.8.0) (2025-07-01)

#### Features

* [feat: "stepwise" assertion format for LLM-friendly output](https://github.com/twada/power-assert-monorepo/pull/23)


## [0.7.0](https://github.com/twada/power-assert-monorepo/releases/tag/swc-plugin-power-assert-v0.7.0) (2025-06-02)


#### Features

* **swc-plugin-power-assert:** upgrade swc_core crate to 26.3.* ([eed8cde6](https://github.com/twada/power-assert-monorepo/commit/eed8cde6884621319e334ae07d05b6b00dc85ae6))


## [0.6.0](https://github.com/twada/power-assert-monorepo/releases/tag/swc-plugin-power-assert-v0.6.0) (2025-01-01)

#### Features

* [Update swc_core (crate) to v9 to support @swc/core (npm) 1.10.0](https://github.com/twada/power-assert-monorepo/pull/20)


## [0.5.0](https://github.com/twada/power-assert-monorepo/releases/tag/swc-plugin-power-assert-v0.5.0) (2024-08-23)

#### Features

* [Update swc_core (crate) to 0.101 to support @swc/core (npm) 1.7.0](https://github.com/twada/power-assert-monorepo/pull/16)


### 0.4.2

#### Bug Fixes

* [Capture CallExpression callee except for Identifier or non-computed MemberExpression](https://github.com/twada/power-assert-monorepo/pull/13)


### 0.4.1

#### Bug Fixes

* update swc_core to 0.95 since v0.94.x is marked as ["Do not use this version if you are building a plugin for SWC"](https://swc.rs/docs/plugin/selecting-swc-core#v094x) ([ffcc200a](https://github.com/twada/power-assert-monorepo/commit/ffcc200a937194e31f789d00cd1c417f6cfcec2e))


## 0.4.0

#### Bug Fixes

* make code content not optional ([f5a354b0](https://github.com/twada/power-assert-monorepo/commit/f5a354b017f993486c387dcd5bbf3f331f2b1d13))

#### Features

* [Adjust CallExpression address if callee is Identifier or non-computed MemberExpression](https://github.com/twada/power-assert-monorepo/pull/12)
* update swc_core to 0.94 ([f465b768](https://github.com/twada/power-assert-monorepo/commit/f465b7688a58c78a0c8f8318a01938507c291c00))


## 0.3.0

#### Bug Fixes

  * skip modifying argument if SpreadElement appears immediately beneath assert ([0d69f3b8](https://github.com/twada/power-assert-monorepo/commit/0d69f3b8373d836ad1f7e98b25e89349b18132a7))
  * [convert absolute path to sandbox path](https://github.com/twada/power-assert-monorepo/pull/10)

#### Features

  * update swc_core to 0.92 ([057a7ad6](https://github.com/twada/power-assert-monorepo/commit/057a7ad6791b56216641fc0a9bfcc7d98b1a8786))


## [0.2.0](https://github.com/twada/power-assert-monorepo/releases/tag/swc-plugin-power-assert-v0.2.0)

#### Bug Fixes

  * expression address to be embedded should be based on UTF-16 instead of UTF8 ([6f7c47c3](https://github.com/twada/power-assert-monorepo/commit/6f7c47c30780c79e8ff57b44982d89f1f83b4423))
  * store span offset at the beginning of Program/Module node due to SWC issue ([5ef44782](https://github.com/twada/power-assert-monorepo/commit/5ef447829786dd8db3525114fcdd272120b5717f))
  * fix UpdateExpression address when prefix is false ([41f4f491](https://github.com/twada/power-assert-monorepo/commit/41f4f49152ecfc4c9df67123bd3a09de1fa92aa5))
  * do not capture callee of computed MemberExpression ([93185365](https://github.com/twada/power-assert-monorepo/commit/93185365778793d36aaa9ff230f2d113a3c21184))

#### Features

  * support UnaryExpression ([b741ef9e](https://github.com/twada/power-assert-monorepo/commit/b741ef9e31be01d2af0dfdc5fba3c387f80aaf3b))
  * support NewExpression ([24f28392](https://github.com/twada/power-assert-monorepo/commit/24f2839253c6eb677755a08e6a482fed7dd7d38d))
  * support UpdateExpression ([ec884698](https://github.com/twada/power-assert-monorepo/commit/ec8846987c29359f2f59345cbbe88208a30b1ac7))
  * support FunctionExpression ([29637b0b](https://github.com/twada/power-assert-monorepo/commit/29637b0b168636880928bb3a95a2fad59e2e9ba9))
  * support AwaitExpression ([64c13aaa](https://github.com/twada/power-assert-monorepo/commit/64c13aaaf8517ff990ec537c50455378c813641a))
  * support vitest's assert ([a72c6e48](https://github.com/twada/power-assert-monorepo/commit/a72c6e48b24ba270f8586211b3847cc7a09443d3))
