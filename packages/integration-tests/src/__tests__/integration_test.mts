/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-eval: 0 */
import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict'; // variable 'assert' is referenced in eval
import { _power_ } from '@power-assert/runtime'; // variable '_power_' is referenced in eval
// import { _power_ } from '../runtime/runtime.mjs'; // variable '_power_' is referenced in eval
import { transpileWithSeparatedSourceMap } from '@power-assert/transpiler/src/transpile-with-sourcemap.mjs';
// import { transpileWithSeparatedSourceMap } from '../transpiler/transpile-with-sourcemap.mjs';
import { SourceMapConsumer } from 'source-map';
import type { AssertionError } from 'node:assert';

type TestFunc = (transpiledCode: string) => void;

function isAssertionError (e: unknown): e is AssertionError {
  return e instanceof Error && /^AssertionError/.test(e.name);
}

export function ptest (title: string, testFunc: TestFunc, expected: string, howManyLines = 1) {
  // chop empty lines then extract assertion expression
  const expression = expected.split('\n').slice(2, (2 + howManyLines)).join('\n');
  test(title + ': ' + expression, async () => {
    const transpiled = await transpileWithSeparatedSourceMap(expression, {
      file: 'source.mjs',
      variables: [
        // set variable name explicitly for testing
        'assert'
      ]
    });
    const transpiledLines = transpiled.code.split('\n');
    // comment first line out since import statement does not work in eval
    transpiledLines[0] = "//port { _power_ } from 'espower3/runtime';";
    const evalTargetCode = transpiledLines.join('\n');
    try {
      testFunc(evalTargetCode);
      throw new Error('AssertionError should be thrown');
    } catch (e) {
      if (!isAssertionError(e)) {
        throw e;
      }
      assert.equal(e.message, expected);

      assert(e.stack !== undefined);
      const targetLineInStacktrace = e.stack.split('\n').find((line) => line.startsWith('    at eval'));
      assert(targetLineInStacktrace !== undefined);
      const matchResult = targetLineInStacktrace.match(/eval at <anonymous> \((.+)\), <anonymous>:(\d+):(\d+)\)/);
      assert(matchResult !== null);
      const lineInStacktrace = Number(matchResult[2]);
      const columnInStacktrace = Number(matchResult[3]);

      const generatedAssertionLineNum = transpiledLines.findIndex((line) => line.startsWith('_pasrt1.run')) + 1;
      assert.equal(lineInStacktrace, generatedAssertionLineNum);
      assert.equal(columnInStacktrace, '_pasrt1.r'.length);

      const consumer = await new SourceMapConsumer(transpiled.sourceMap);
      const originalPosition = consumer.originalPositionFor({
        line: lineInStacktrace,
        column: columnInStacktrace
      });
      assert.equal(originalPosition.source, 'source.mjs');
      assert.equal(originalPosition.line, 1);
      assert.equal(originalPosition.column, 0);
    }
  });
}

describe('Integration of transpiler and runtime', () => {
  describe('Identifier', () => {
    ptest('Identifier and empty string', (transpiledCode) => {
      const truthy = '';
      eval(transpiledCode);
    }, `

assert(truthy)
       |
       ""

'' == true
`);
  });

  describe('BinaryExpression', () => {
    ptest('BinaryExpression', (transpiledCode) => {
      const truthy = '1';
      const falsy = 0;
      eval(transpiledCode);
    }, `

assert(truthy === falsy)
       |      |   |
       |      |   0
       |      false
       "1"

"1" === 0
`);
  });

  describe('MemberExpression', () => {
    ptest('MemberExpression computed:false', (transpiledCode) => {
      const foo = {
        bar: false
      };
      eval(transpiledCode);
    }, `

assert(foo.bar)
       |   |
       |   false
       Object{bar:false}

false == true
`);

    ptest('MemberExpression computed:true', (transpiledCode) => {
      const keys = ['b a r'];
      const zero = 0;
      const one = 1;
      const foo = {
        'b a r': [true, false]
      };
      eval(transpiledCode);
    }, `

assert(foo[keys[zero]][one])
       |  ||   ||     ||
       |  ||   ||     |1
       |  ||   ||     false
       |  ||   |0
       |  ||   "b a r"
       |  |["b a r"]
       |  [true,false]
       Object{"b a r":[true,false]}

false == true
`);

    ptest('more MemberExpression computed:true', (transpiledCode) => {
      const keys = {
        0: 'f o o'
      };
      const foo = 'f o o';
      const bar = 'b a r';
      const zero = 0;
      const one = 1;
      const obj = {
        'b a r': [true, false]
      };
      eval(transpiledCode);
    }, `

assert(obj[[[keys[zero], foo][zero], bar][one]][one])
       |  ||||   ||      |   ||      |   ||    ||
       |  ||||   ||      |   ||      |   ||    |1
       |  ||||   ||      |   ||      |   ||    false
       |  ||||   ||      |   ||      |   |1
       |  ||||   ||      |   ||      |   "b a r"
       |  ||||   ||      |   ||      "b a r"
       |  ||||   ||      |   |0
       |  ||||   ||      |   "f o o"
       |  ||||   ||      "f o o"
       |  ||||   |0
       |  ||||   "f o o"
       |  |||Object{"0":"f o o"}
       |  ||["f o o","f o o"]
       |  |["f o o","b a r"]
       |  [true,false]
       Object{"b a r":[true,false]}

false == true
`);
  });

  describe('CallExpression', () => {
    ptest('simple CallExpression', (transpiledCode) => {
      const inner = () => false;
      eval(transpiledCode);
    }, `

assert(inner())
            |
            false

false == true
`);

    ptest('CallExpression of CallExpression of CallExpression', (transpiledCode) => {
      const outer = () => () => () => false;
      eval(transpiledCode);
    }, `

assert(outer()()())
            | | |
            | | false
            | function@anonymous
            function@anonymous

false == true
`);

    ptest('simple method call', (transpiledCode) => {
      const inner = () => false;
      eval(transpiledCode);
    }, `

assert(inner().toString() === 'true')
            |          |  |   |
            |          |  |   "true"
            |          |  false
            |          "false"
            false

"false" === "true"
`);
  });

  describe('ConditionalExpression', () => {
    ptest('ConditionalExpression', (transpiledCode) => {
      const foo = 1;
      const bar = null;
      const baz = true;
      eval(transpiledCode);
    }, `

assert(foo ? bar : baz)
       |   | |
       |   | null
       |   null
       1

null == true
`);

    ptest('ConditionalExpression of ConditionalExpression', (transpiledCode) => {
      const foo = 1;
      const bar = null;
      const baz = true;
      const toto = 1;
      const tata = 0;
      eval(transpiledCode);
    }, `

assert((foo ? bar : baz) ? toto : tata)
        |   | |          |        |
        |   | |          |        0
        |   | |          0
        |   | null
        |   null
        1

0 == true
`);
  });

  describe('LogicalExpression', () => {
    ptest('Logical OR', (transpiledCode) => {
      const a = -3;
      const b = -2;
      eval(transpiledCode);
    }, `

assert(a > 0 || b > 0)
       | | | |  | | |
       | | | |  | | 0
       | | | |  | false
       | | | |  -2
       | | | false
       | | 0
       | false
       -3

false == true
`);

    ptest('Logical AND', (transpiledCode) => {
      const a = -3;
      const b = -2;
      eval(transpiledCode);
    }, `

assert(a > 0 && b > 0)
       | | | |
       | | | false
       | | 0
       | false
       -3

false == true
`);
  });

  describe('assertion with multiple lines', () => {
    ptest('assertion with multiple lines', (transpiledCode) => {
      const truthy = '1';
      const falsy = 0;
      eval(transpiledCode);
    }, `

assert.equal(truthy,
  falsy,
  'falsy is not truthy')

falsy is not truthy
`, 3);

    ptest('BinaryExpression analysis', (transpiledCode) => {
      const truthy = '1';
      const falsy = 0;
      eval(transpiledCode);
    }, `

assert(truthy
       ===
       falsy)

"1" === 0
`, 3);
  });

  ptest('move to next line if width of string is unknown', (transpiledCode) => {
    const loooooooooongVarName = '𠮷野家👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦で𩸽';
    const falsy = 0;
    eval(transpiledCode);
  }, `

assert(loooooooooongVarName === falsy)
       |                    |   |
       |                    |   0
       |                    false
       "𠮷野家👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦で𩸽"

"𠮷野家👨‍👩‍👧‍👦👨‍👩‍👧‍👦👨‍👩‍👧‍👦で𩸽" === 0
`);
});
