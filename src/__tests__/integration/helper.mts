import { test } from 'node:test';
import { AssertionError, strict as assert } from 'node:assert';
import { espowerAst } from '../../transpiler/transpiler-core.mjs';
import { parse } from 'acorn';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { fromJSON } from 'convert-source-map';
import type { Node } from 'estree';

function transpile (code: string): string {
  const ast: Node = parse(code, {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true,
    ranges: true
  }) as Node;
  const poweredAst = espowerAst(ast, {
    variables: [
      // set variable name explicitly for testing
      'assert'
    ],
    // runtime: 'espower3/runtime',
    code
  });
  const smg = new SourceMapGenerator({
    file: 'source.mjs'
  });
  const transpiledCode = generate(poweredAst, {
    sourceMap: smg
  });
  const outMap = fromJSON(smg.toString());
  return transpiledCode + '\n' + outMap.toComment() + '\n';
}

function isAssertionError (e: unknown): e is AssertionError {
  return e instanceof Error && /^AssertionError/.test(e.name);
}

type TestFunc = (transpiledCode: string) => void;
export function ptest (title: string, testFunc: TestFunc, expected: string, howManyLines = 1) {
  // chop first line then extract assertion expression
  const expression = expected.split('\n').slice(2, (2 + howManyLines)).join('\n');
  test(title + ': ' + expression, () => {
    // remove first line contains import { _power_ } from '@power-assert/runtime'
    const transpiledCode = transpile(expression).split('\n').slice(1).join('\n');
    try {
      testFunc(transpiledCode);
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
