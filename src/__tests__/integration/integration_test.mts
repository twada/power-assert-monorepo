/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-eval: 0 */
import { describe } from 'node:test';
import { strict as assert } from 'node:assert/strict'; // variable 'assert' is referenced in eval
// import { _power_ } from 'espower3/runtime'; // variable '_power_' is referenced in eval
import { _power_ } from '../../runtime/runtime.mjs'; // variable '_power_' is referenced in eval
import { ptest } from './helper.mjs';

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
             falsy)

Expected values to be strictly equal:

'1' !== 0

`, 2);

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
