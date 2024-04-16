## [0.3.0](https://github.com/twada/power-assert-monorepo/releases/tag/transpiler-core-v0.3.0) (2024-04-17)


#### Features

* make `originalCode` argument mandatory ([b4c3b82b](https://github.com/twada/power-assert-monorepo/commit/b4c3b82b3ecb257d0f9b5d4254bf5c4010dd7f87))

#### Breaking Changes

* now `options.code` is not optional so move `options.code` to `originalCode` argument

 ([b4c3b82b](https://github.com/twada/power-assert-monorepo/commit/b4c3b82b3ecb257d0f9b5d4254bf5c4010dd7f87))



## [0.2.0](https://github.com/twada/power-assert-monorepo/releases/tag/transpiler-core-v0.2.0) (2024-03-16)


#### Bug Fixes

  * fix UpdateExpression address when prefix is false ([4cb06a8f](https://github.com/twada/power-assert-monorepo/commit/4cb06a8fa9eb902c0a5c4233ac8f61bcaae01a74))

#### Features

  * [Replace estraverse with estree-walker](https://github.com/twada/power-assert-monorepo/pull/2)
  * support deep capture of UpdateExpression ([2950c026](https://github.com/twada/power-assert-monorepo/commit/2950c02666573cc641a576d4f36995cec5f002c3))
