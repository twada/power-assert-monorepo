import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { matchUrl } from '../../dist/src/esm/power-assert.mjs';

function pattern(filepath, expected) {
    it(filepath, () => assert.deepEqual(matchUrl(filepath), expected));
}

describe('matchUrl', () => {
  describe("^test$ - Files whose basename is the string 'test'. Examples: test.js, test.cjs, test.mjs.", () => {
    pattern('file:///path/to/test.js', [true, false]);
    pattern('file:///path/to/test.mjs', [true, true]);
    pattern('file:///path/to/test.ts', [true, false]);
    pattern('file:///path/to/test.mts', [true, true]);
  });

  describe("^test-.+ - Files whose basename starts with the string 'test-' followed by one or more characters. Examples: test-example.js, test-another-example.mjs.", () => {
    pattern('file:///path/to/test-some.js', [true, false]);
    pattern('file:///path/to/test-some.mjs', [true, true]);
    pattern('file:///path/to/test-some.ts', [true, false]);
    pattern('file:///path/to/test-some.mts', [true, true]);

    pattern('file:///path/to/test_some.js', [false, false]);
    pattern('file:///path/to/test_some.mjs', [false, false]);
    pattern('file:///path/to/test_some.ts', [false, false]);
    pattern('file:///path/to/test_some.mts', [false, false]);

    pattern('file:///path/to/test.some.js', [false, false]);
    pattern('file:///path/to/test.some.mjs', [false, false]);
    pattern('file:///path/to/test.some.ts', [false, false]);
    pattern('file:///path/to/test.some.mts', [false, false]);
  });

  describe(".+[\.\-\_]test$ - Files whose basename ends with .test, -test, or _test, preceded by one or more characters. Examples: example.test.js, example-test.cjs, example_test.mjs.", () => {
    pattern('file:///path/to/some-test.js', [true, false]);
    pattern('file:///path/to/some-test.mjs', [true, true]);
    pattern('file:///path/to/some-test.ts', [true, false]);
    pattern('file:///path/to/some-test.mts', [true, true]);

    pattern('file:///path/to/some_test.js', [true, false]);
    pattern('file:///path/to/some_test.mjs', [true, true]);
    pattern('file:///path/to/some_test.ts', [true, false]);
    pattern('file:///path/to/some_test.mts', [true, true]);

    pattern('file:///path/to/some.test.js', [true, false]);
    pattern('file:///path/to/some.test.mjs', [true, true]);
    pattern('file:///path/to/some.test.ts', [true, false]);
    pattern('file:///path/to/some.test.mts', [true, true]);
  });
});
