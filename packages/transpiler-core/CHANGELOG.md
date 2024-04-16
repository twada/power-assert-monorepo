## [0.3.0](https://github.com/twada/power-assert-monorepo/releases/tag/transpiler-core-v0.3.0) (2024-04-17)


#### Features

* Make `originalCode` argument mandatory ([b4c3b82b](https://github.com/twada/power-assert-monorepo/commit/b4c3b82b3ecb257d0f9b5d4254bf5c4010dd7f87))
* [Drop CJS support](https://github.com/twada/power-assert-monorepo/pull/6)


#### Breaking Changes

* now `options.code` is not optional so move `options.code` to `originalCode` argument. ([b4c3b82b](https://github.com/twada/power-assert-monorepo/commit/b4c3b82b3ecb257d0f9b5d4254bf5c4010dd7f87))
* new transpiler only supports ESM -> ESM transformation. For CJS support, use [babel-preset-power-assert](https://github.com/power-assert-js/babel-preset-power-assert). ([7b3ad51c](https://github.com/twada/power-assert-monorepo/commit/7b3ad51c74ad267ea31f6ee4b9db8c81bc70d4f2))


## [0.2.0](https://github.com/twada/power-assert-monorepo/releases/tag/transpiler-core-v0.2.0) (2024-03-16)


#### Bug Fixes

  * fix UpdateExpression address when prefix is false ([4cb06a8f](https://github.com/twada/power-assert-monorepo/commit/4cb06a8fa9eb902c0a5c4233ac8f61bcaae01a74))

#### Features

  * [Replace estraverse with estree-walker](https://github.com/twada/power-assert-monorepo/pull/2)
  * support deep capture of UpdateExpression ([2950c026](https://github.com/twada/power-assert-monorepo/commit/2950c02666573cc641a576d4f36995cec5f002c3))
