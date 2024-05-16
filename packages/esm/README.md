@power-assert/esm
================================

Node.js custom hook for power-assert.


INSTALL
---------------------------------------

```
$ npm install --save-dev @power-assert/esm
```


EXAMPLE
---------------------------------------

For given `test.mjs` below,

```javascript
import { test } from 'node:test';
import assert from 'node:assert';

test('example', () => {
  const truthy = 1;
  const falsy = 0;
  assert(truthy === falsy);
});
```

use `@power-assert/esm` with `--import` option.

```
node --enable-source-maps --no-warnings --import @power-assert/esm --test test.mjs
```

Then you will see the power-assert output.

```sh
> node --enable-source-maps --no-warnings --import @power-assert/esm --test test.mjs

✖ example (8.599667ms)
  AssertionError [ERR_ASSERTION]:

  assert(truthy === falsy)
         |      |   |
         |      |   0
         |      false
         1

  1 === 0

      at TestContext.<anonymous> (/path/to/project/test.mjs:7:3)
      at Test.runInAsyncScope (node:async_hooks:206:9)
      at Test.run (node:internal/test_runner/test:631:25)
      at Test.start (node:internal/test_runner/test:542:17)
      at startSubtest (node:internal/test_runner/harness:216:17) {
    generatedMessage: false,
    code: 'ERR_ASSERTION',
    actual: 1,
    expected: 0,
    operator: '==='
  }
```

