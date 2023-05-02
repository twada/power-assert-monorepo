import { test } from 'node:test';
import assert from 'node:assert/strict';
import { espowerAst } from '../dist/transpiler/transpiler.mjs';
import { parse } from 'acorn';
import { generate } from 'escodegen';

function transpile (code) {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: '2022',
    locations: true,
    ranges: true
  });
  const poweredAst = espowerAst(ast, {
    variables: [
      // set variable name explicitly for testing
      'assert'
    ],
    code
  });
  return generate(poweredAst);
}

export function ptest (title, testFunc, expected) {
  // extract assertion expression
  const expression = expected.split('\n').slice(1)[0];
  test(title + ': ' + expression, () => {
    // remove first line contains import { _power_ } from '@power-assert/runtime'
    const transpiledCode = transpile(expression).split('\n').slice(1).join('\n');
    try {
      testFunc(transpiledCode);
      assert.fail('AssertionError should be thrown');
    } catch (e) {
      assert.equal(e.message, expected);
    }
  });
}
