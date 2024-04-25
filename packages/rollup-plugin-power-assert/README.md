rollup-plugin-power-assert
================================

[Rollup](https://rollupjs.org/) plugin for power-assert: Provides descriptive assertion messages through standard [assert](https://nodejs.org/api/assert.html) interface. No API is the best API.

Note that rollup-plugin-power-assert also supports [Vitest's assert API](https://vitest.dev/api/assert).

[![power-assert][power-assert-banner]][power-assert-url]

[![License][license-image]][license-url]


INSTALL
---------------------------------------

```
$ npm install --save-dev rollup-plugin-power-assert
```

USAGE
---------------------------------------

### Rollup

Create a `rollup.config.js` [configuration file](https://rollupjs.org/command-line-interface/#configuration-files) and import the plugin:

```js
import { globSync } from 'glob';
import { powerAssert } from 'rollup-plugin-power-assert';

export default {
  input: globSync('**/*.mjs'),
  plugins: [
    powerAssert({
      include: ['**/*.test.mjs']
    })
  ]
};
```

Then call `rollup` either via the [CLI](https://rollupjs.org/command-line-interface/) or the [API](https://rollupjs.org/javascript-api/).

### Vite/Vitest usage and example

For given test file `examples/__tests__/demo.test.mts` below,

```js
import { describe, it, assert } from 'vitest';

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

Create a `vite.config.js` [configuration file](https://vitejs.dev/guide/using-plugins.html) and import the plugin:

```js
import { defineConfig } from 'vite';
import { powerAssert } from 'rollup-plugin-power-assert';
const testPattern = 'examples/**/__tests__/**/*.test.mts';

export default defineConfig({
  plugins: [
    powerAssert({
      include: testPattern,
    }),
  ],
  test: {
    include: testPattern,
    // ...
  },
});
```

Run `vitest run`. You will see the power-assert output appears.

```
> vitest run

 ❯ examples/__tests__/demo.test.mts (2)
   ❯ power-assert demo (2)
     × Array#indexOf
     × Destructuring and TemplateLiteral

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯

 FAIL  examples/__tests__/demo.test.mts > power-assert demo > Array#indexOf
AssertionError:

assert(ary.indexOf(zero) === two)
       |          ||     |   |
       |          ||     |   2
       |          ||     false
       |          |0
       |          0
       [0,1,2]

0 === 2


- Expected
+ Received

- 2
+ 0

 ❯ examples/__tests__/demo.test.mts:8:5
      6|     const zero = 0;
      7|     const two = 2;
      8|     assert(ary.indexOf(zero) === two);
       |     ^
      9|   });
     10|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  examples/__tests__/demo.test.mts > power-assert demo > Destructuring and TemplateLiteral
AssertionError:

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


- Expected
+ Received

- bob and alice
+ alice and bob

 ❯ examples/__tests__/demo.test.mts:13:5
     11|   it('Destructuring and TemplateLiteral', () => {
     12|     let [alice, bob] = [ { name: 'alice' }, { name: 'bob' } ];
     13|     assert(`${alice.name} and ${bob.name}` === `bob and alice`);
       |     ^
     14|   });
     15| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed (2)
   Start at  17:16:32
   Duration  198ms (transform 58ms, setup 0ms, collect 52ms, tests 6ms, environment 0ms, prepare 42ms)
```



OPTIONS
---------------------------------------

### `include`

Type: `String | RegExp | Array[...String|RegExp]`<br>
Default: `[]`<br>
Example: `include: '**/__tests__/**/*test.js',`<br>

A pattern, or array of patterns, which specify the files in the build the plugin should operate on.

### `exclude`

Type: `String | RegExp | Array[...String|RegExp]`<br>
Default: `[]`<br>

A pattern, or array of patterns, which specify the files in the build the plugin should _ignore_.


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
