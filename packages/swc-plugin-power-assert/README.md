swc-plugin-power-assert
================================

[SWC](https://swc.rs/) plugin for power-assert: Provides descriptive assertion messages through standard [assert](https://nodejs.org/api/assert.html) interface. No API is the best API.

[![power-assert][power-assert-banner]][power-assert-url]

[![License][license-image]][license-url]

```
test at examples/bowling.test.mjs:97:5
✖ real example (7.283209ms)
  AssertionError [ERR_ASSERTION]:

  assert(scoreOf(rollsOf(frames)) === 132)
         |       |       |        |   |
         |       |       |        |   132
         |       |       |        false
         |       |       [[1,4],[4,5],[6,4],[5,5],[10],[0,1],[7,3],[6,4],[10],[2,8,6]]
         |       [1,4,4,5,6,4,5,5,10,0,1,7,3,6,4,10,2,8,6]
         133

  133 === 132

      at TestContext.<anonymous> (/path/to/bowling.test.mjs:110:7)
      at Test.runInAsyncScope (node:async_hooks:206:9)
      at Test.run (node:internal/test_runner/test:824:25)
      at Suite.processPendingSubtests (node:internal/test_runner/test:533:18)
      at Test.postRun (node:internal/test_runner/test:923:19)
      at Test.run (node:internal/test_runner/test:866:12)
      at async Promise.all (index 0)
      at async Suite.run (node:internal/test_runner/test:1183:7)
      at async Promise.all (index 0)
      at async Suite.run (node:internal/test_runner/test:1183:7) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 133,
    expected: 132,
    operator: '==='
  }
```

INSTALL
---------------------------------------

```
$ npm install --save-dev swc-plugin-power-assert
```

USAGE
---------------------------------------

via `@swc/core` module
```
const transpiled = await swc.transformFile(inputFilepath, {
  sourceMaps: true,
  isModule: true,
  swcrc: false,
  jsc: {
    parser: {
      syntax: 'ecmascript'
    },
    transform: {},
    target: 'es2022',
    experimental: {
      plugins: [
        ['swc-plugin-power-assert', {}]
      ]
    }
  }
});
```


via `.swcrc` file
```
{
  "jsc": {
    "parser": {
      "syntax": "ecmascript"
    },
    "experimental": {
      "plugins": [
        ["./swc_plugin_power_assert.wasm", {}]
      ]
    }
  },
  "sourceMaps": true,
  "inlineSourcesContent": true
}
```



AUTHOR
---------------------------------------
* [Takuto Wada](https://github.com/twada)


LICENSE
---------------------------------------
Licensed under the [MIT](https://twada.mit-license.org/) license.

[power-assert-url]: https://github.com/power-assert-js
[power-assert-banner]: https://raw.githubusercontent.com/power-assert-js/power-assert-js-logo/master/banner/banner-official-fullcolor.png

[license-url]: https://twada.mit-license.org/
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg
