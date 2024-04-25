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

### Vite/Vitest

Create a `vite.config.js` [configuration file](https://vitejs.dev/guide/using-plugins.html) and import the plugin:

```js
import { defineConfig } from 'vite';
import { powerAssert } from 'rollup-plugin-power-assert';

export default defineConfig({
  plugins: [
    powerAssert({
      include: ['**/__test__/**/*test.mts'],
    }),
  ],
  test: {
    include: ['**/__test__/**/*test.mts'],
    // ...
  },
});
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
