/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-eval: 0 */
import { describe } from 'node:test';
import assert from 'node:assert/strict'; // variable 'assert' is referenced in eval
import { _power_ } from '../dist/runtime/runtime.mjs'; // variable '_power_' is referenced in eval
import { ptest } from './helper.mjs';

describe('Integration of transpiler and runtime', () => {
  ptest('Identifier and empty string', (transpiledCode) => {
    const truthy = '';
    eval(transpiledCode);
  }, `
assert(truthy)
       |      
       ""     

'' == true
`);
  // const _pasrt1 = _power_(assert, null, "assert(truthy)");
  // const _parg1 = _pasrt1.recorder(0);
  // _pasrt1.run(_parg1.rec(truthy, "arguments/0", 7));

  ptest('BinaryExpression', (transpiledCode) => {
    const truthy = '1';
    const falsy = 0;
    eval(transpiledCode);
  }, `
assert(truthy === falsy)
       |      |   |     
       |      |   0     
       "1"    false     

"1" === 0
`);
  // const _pasrt1 = _power_(assert, null, "assert(truthy === falsy)", {
  //   binexp: "==="
  // });
  // const _parg1 = _pasrt1.recorder(0);
  // _pasrt1.run(_parg1.rec(_parg1.tap(truthy, "arguments/0/left", 7) === _parg1.tap(falsy, "arguments/0/right", 18), "arguments/0", 14));

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
  // const _pasrt1 = _power_(assert.equal, assert, "assert.equal(truthy,n             falsy)");
  // const _parg1 = _pasrt1.recorder(0);
  // const _parg2 = _pasrt1.recorder(1);
  // _pasrt1.run(_parg1.rec(truthy, "arguments/0", 13), _parg2.rec(falsy, "arguments/1", 13));

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
  // const _pasrt1 = _power_(assert, null, "assert(truthyn       ===\n       falsy)", {
  //   binexp: "==="
  // });
  // const _parg1 = _pasrt1.recorder(0);
  // _pasrt1.run(_parg1.rec(_parg1.tap(truthy, "arguments/0/left", 7) === _parg1.tap(falsy, "arguments/0/right", 7), "arguments/0", 21));
});
