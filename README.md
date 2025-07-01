# power-assert-monorepo

Power Assert in JavaScript - Provides descriptive assertion messages through standard assert interface. No API is the best API.

[![power-assert][power-assert-banner]][power-assert-url]

[![License][license-image]][license-url]

## What is power-assert?

Power Assert enhances the standard `assert` function to provide descriptive error messages that show the values of all sub-expressions in the assertion. When an assertion fails, instead of a simple error message, you get a detailed diagram showing exactly what went wrong.

### Example

```typescript
import assert from 'node:assert/strict';

const ary: number[] = [1,2,3];

const zero: number = 0;
const two: number = 2;

assert(ary.indexOf(zero) === two);
```

With power-assert, this produces:

```
AssertionError [ERR_ASSERTION]:

# Human-readable format:
assert(ary.indexOf(zero) === two)
       |   |       |     |   |
       |   |       |     |   2
       |   |       |     false
       |   |       0
       |   -1
       [1,2,3]

# AI-readable format:
Assertion failed: assert(ary.indexOf(zero) === two)
=== arg:0 ===
Step 1: `ary` => [1,2,3]
Step 2: `zero` => 0
Step 3: `ary.indexOf(zero)` => -1
Step 4: `two` => 2
Step 5: `ary.indexOf(zero) === two` => false

-1 === 2
```

### LLM-Friendly Stepwise Format

In addition to the traditional diagram format, power-assert now provides an AI-readable "stepwise" format that presents assertion failures as numbered sequential steps. This format is particularly useful for LLM/AI systems that need to parse and understand assertion failures.

When an assertion fails, both formats are displayed:

### Traditional Format + Stepwise Format Example

Output:
```
AssertionError [ERR_ASSERTION]:

# Human-readable format:
assert(scoreOf(rollsOf(frames)) === 132)
       |       |       |        |   |
       |       |       |        |   132
       |       |       |        false
       |       |       [[1,4],[4,5],[6,4],[5,5],[10],[0,1],[7,3],[6,4],[10],[2,8,6]]
       |       [1,4,4,5,6,4,5,5,10,0,1,7,3,6,4,10,2,8,6]
       133

# AI-readable format:
Assertion failed: assert(scoreOf(rollsOf(frames)) === 132)
=== arg:0 ===
Step 1: `frames` => [[1,4],[4,5],[6,4],[5,5],[10],[0,1],[7,3],[6,4],[10],[2,8,6]]
Step 2: `rollsOf(frames)` => [1,4,4,5,6,4,5,5,10,0,1,7,3,6,4,10,2,8,6]
Step 3: `scoreOf(rollsOf(frames))` => 133
Step 4: `132` => 132
Step 5: `scoreOf(rollsOf(frames)) === 132` => false

133 === 132
```

The stepwise format provides:
- **Clear execution order**: Each step shows the evaluation sequence
- **Expression extraction**: Original source expressions are preserved
- **Argument grouping**: Multiple argument assertions are organized by argument
- **LLM-friendly parsing**: Structured format that's easy for AI systems to understand

## Module System

**Important**: This project only supports ES modules (ESM). CommonJS (CJS) is not supported.

## Philosophy

Power Assert follows the principle of "No API is the best API". You don't need to learn a new assertion library API - just use the standard `assert` function you already know. Power Assert enhances it transparently to provide better error messages when assertions fail.

## Quick Start

### Using with Node.js Test Runner

For Node.js v22.14.0 or later:

```bash
npm install --save-dev @power-assert/node
```

```typescript
// test/example.test.mts
import assert from 'node:assert/strict';
import { test } from 'node:test';

type Person = { name: string };

test('example test', () => {
  const alice: Person = { name: 'alice' };
  const bob: Person = { name: 'bob' };
  assert(`${alice.name} and ${bob.name}` === `bob and alice`);
});
```

#### Lightweight TypeScript Support (Type Stripping)

For lightweight TypeScript support, you can use Node.js built-in [Type Stripping](https://nodejs.org/docs/latest/api/typescript.html#type-stripping):

```bash
# Node.js v23.6.0+
node --enable-source-maps --import @power-assert/node --test test/example.test.ts

# Node.js v22.6.0 - v23.5.x (requires explicit flag)
node --experimental-strip-types --enable-source-maps --import @power-assert/node --test test/example.test.ts
```

#### Full TypeScript Support

For full TypeScript support, use tsimp:

```bash
npm install --save-dev tsimp
node --enable-source-maps --import tsimp/import --import @power-assert/node --test test/example.test.ts
```

### Using with Vitest

```bash
npm install --save-dev rollup-plugin-power-assert
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import powerAssert from 'rollup-plugin-power-assert';

export default defineConfig({
  plugins: [powerAssert()]
});
```

```typescript
// test/example.test.ts
import { test, assert } from 'vitest';

type Person = { name: string };

test('example test', () => {
  const alice: Person = { name: 'alice' };
  const bob: Person = { name: 'bob' };
  assert(`${alice.name} and ${bob.name}` === `bob and alice`);
});
```

Run with:
```bash
npx vitest
```

### Using with SWC

```bash
npm install --save-dev swc-plugin-power-assert
```

Create a `.swcrc` configuration file:

```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": false
    },
    "experimental": {
      "plugins": [
        ["swc-plugin-power-assert", {}]
      ]
    }
  },
  "sourceMaps": true,
  "inlineSourcesContent": true
}
```

Or use programmatically with `@swc/core`:

```typescript
import swc from '@swc/core';

const transpiled = await swc.transformFile('test.ts', {
  sourceMaps: true,
  jsc: {
    parser: {
      syntax: 'typescript'
    },
    experimental: {
      plugins: [
        ['swc-plugin-power-assert', {}]
      ]
    }
  }
});
```

## Packages

This monorepo contains the following packages:

### Core Packages

- [@power-assert/transpiler-core](packages/transpiler-core) - Core transpilation logic for transforming assert statements
- [@power-assert/transpiler](packages/transpiler) - Transpiler with sourcemap support
- [@power-assert/runtime](packages/runtime) - Runtime library that generates descriptive assertion diagrams

### Integration Packages

- [@power-assert/node](packages/node) - Custom hook for Node.js Test Runner (requires Node.js v22.14.0+)
- [rollup-plugin-power-assert](packages/rollup-plugin-power-assert) - Plugin for Rollup and Vite (also supports Vitest)
- [swc-plugin-power-assert](packages/swc-plugin-power-assert) - High-performance SWC plugin written in Rust

### Testing

- [integration-tests](packages/integration-tests) - Cross-package integration test suite

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

[Takuto Wada](https://github.com/twada)

[power-assert-url]: https://github.com/power-assert-js
[power-assert-banner]: https://raw.githubusercontent.com/power-assert-js/power-assert-js-logo/master/banner/banner-official-fullcolor.png

[license-url]: https://twada.mit-license.org/
[license-image]: https://img.shields.io/badge/license-MIT-brightgreen.svg
