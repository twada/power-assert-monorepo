@power-assert/node
================================

power-assert custom hook for Node Test Runner: Provides descriptive assertion messages through standard [assert](https://nodejs.org/api/assert.html) interface. No API is the best API.

[![power-assert][power-assert-banner]][power-assert-url]

[![License][license-image]][license-url]

```
    assert(`${alice.name} and ${bob.name}` === `bob and alice`)
           |  |     |           |   |      |   |
           |  |     |           |   |      |   "bob and alice"
           |  |     |           |   |      false
           |  |     |           |   "bob"
           |  |     |           Object{name:"bob"}
           |  |     "alice"
           |  Object{name:"alice"}
           "alice and bob"

    "alice and bob" === "bob and alice"
```


INSTALL
---------------------------------------

```
$ npm install --save-dev @power-assert/node
```


EXAMPLE
---------------------------------------

For given `demo.test.mjs` below,

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('power-assert demo', () => {
  it('Array#indexOf', () => {
    const ary = [0,1,2];
    const zero = 0;
    const two = 2;
    assert(ary.indexOf(zero) === two);
  });

  it('Destructuring and TemplateLiteral', () => {
    let [alice, bob] = [ { name: 'alice' }, { name: 'bob' } ];
    assert(`${alice.name} and ${bob.name}` === `bob and alice`);
  });
});
```

use `@power-assert/node` with `--import` option.

```
node --enable-source-maps --import @power-assert/node --test demo.test.mjs
```

Then you will see the power-assert output.

```sh
> node --enable-source-maps --import @power-assert/node --test demo.test.mjs

▶ power-assert demo
  ✖ Array#indexOf (8.774208ms)
    AssertionError [ERR_ASSERTION]:

    assert(ary.indexOf(zero) === two)
           |          ||     |   |
           |          ||     |   2
           |          ||     false
           |          |0
           |          0
           [0,1,2]

    0 === 2

        at TestContext.<anonymous> (/path/to/demo.test.mjs:9:5)
        at Test.runInAsyncScope (node:async_hooks:206:9)
        at Test.run (node:internal/test_runner/test:824:25)
        at Test.start (node:internal/test_runner/test:721:17)
        at node:internal/test_runner/test:1181:71
        at node:internal/per_context/primordials:488:82
        at new Promise (<anonymous>)
        at new SafePromise (node:internal/per_context/primordials:456:29)
        at node:internal/per_context/primordials:488:9
        at Array.map (<anonymous>) {
      generatedMessage: false,
      code: 'ERR_ASSERTION',
      actual: 0,
      expected: 2,
      operator: '==='
    }

  ✖ Destructuring and TemplateLiteral (1.033292ms)
    AssertionError [ERR_ASSERTION]:

    assert(`${alice.name} and ${bob.name}` === `bob and alice`)
           |  |     |           |   |      |   |
           |  |     |           |   |      |   "bob and alice"
           |  |     |           |   |      false
           |  |     |           |   "bob"
           |  |     |           Object{name:"bob"}
           |  |     "alice"
           |  Object{name:"alice"}
           "alice and bob"

    "alice and bob" === "bob and alice"

        at TestContext.<anonymous> (/path/to/demo.test.mjs:14:5)
        at Test.runInAsyncScope (node:async_hooks:206:9)
        at Test.run (node:internal/test_runner/test:824:25)
        at Suite.processPendingSubtests (node:internal/test_runner/test:533:18)
        at Test.postRun (node:internal/test_runner/test:923:19)
        at Test.run (node:internal/test_runner/test:866:12)
        at async Promise.all (index 0)
        at async Suite.run (node:internal/test_runner/test:1183:7)
        at async Test.processPendingSubtests (node:internal/test_runner/test:533:7) {
      generatedMessage: false,
      code: 'ERR_ASSERTION',
      actual: 'alice and bob',
      expected: 'bob and alice',
      operator: '==='
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
