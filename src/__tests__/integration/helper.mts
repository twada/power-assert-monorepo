import { test } from 'node:test';
import { AssertionError, strict as assert } from 'node:assert';
import { transpile } from '../../transpiler/transpile-with-sourcemap.mjs';

type TestFunc = (transpiledCode: string) => void;

function isAssertionError (e: unknown): e is AssertionError {
  return e instanceof Error && /^AssertionError/.test(e.name);
}

export function ptest (title: string, testFunc: TestFunc, expected: string, howManyLines = 1) {
  // chop first line then extract assertion expression
  const expression = expected.split('\n').slice(2, (2 + howManyLines)).join('\n');
  test(title + ': ' + expression, async () => {
    // remove first line contains import { _power_ } from '@power-assert/runtime'
    const transpiledCode = await transpile(expression, 'source.mjs', {
      variables: [
        // set variable name explicitly for testing
        'assert'
      ]
    });
    try {
      testFunc(transpiledCode.split('\n').slice(1).join('\n'));
      throw new Error('AssertionError should be thrown');
    } catch (e) {
      if (isAssertionError(e)) {
        assert.equal(e.message, expected);
      } else {
        throw e;
      }
    }
  });
}
