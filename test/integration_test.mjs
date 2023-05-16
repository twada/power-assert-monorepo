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
