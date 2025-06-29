import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { renderStepwise } from '../stepwise.mjs';

describe('renderStepwise', () => {
  it('BinaryExpression', () => {
    const actual = renderStepwise('assert.ok(truthy === falsy)', [
      { value: '1', markerPos: 10, startPos: 10, endPos: 16, evalOrder: 1, argIndex: 0 },
      { value: 0, markerPos: 21, startPos: 21, endPos: 26, evalOrder: 2, argIndex: 0 },
      { value: false, markerPos: 17, startPos: 10, endPos: 26, evalOrder: 3, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`truthy\` => "1"
Step 2: \`falsy\` => 0
Step 3: \`truthy === falsy\` => false
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('MemberExpression', () => {
    const actual = renderStepwise('assert(foo.bar)', [
      { value: { bar: 0 }, markerPos: 7, startPos: 7, endPos: 10, evalOrder: 1, argIndex: 0 },
      { value: 0, markerPos: 11, startPos: 7, endPos: 14, evalOrder: 2, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`foo\` => Object{bar:0}
Step 2: \`foo.bar\` => 0
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('CallExpression', () => {
    const actual = renderStepwise('assert(inner())', [
      { value: false, markerPos: 7, startPos: 7, endPos: 14, evalOrder: 1, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`inner()\` => false
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('ConditionalExpression', () => {
    const actual = renderStepwise('assert((foo ? bar : baz) ? toto : tata)', [
      { value: 1, markerPos: 8, startPos: 8, endPos: 11, evalOrder: 1, argIndex: 0 },
      { value: null, markerPos: 14, startPos: 14, endPos: 17, evalOrder: 2, argIndex: 0 },
      { value: null, markerPos: 12, startPos: 8, endPos: 23, evalOrder: 3, argIndex: 0 },
      { value: 0, markerPos: 34, startPos: 34, endPos: 38, evalOrder: 4, argIndex: 0 },
      { value: 0, markerPos: 25, startPos: 7, endPos: 38, evalOrder: 5, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`foo\` => 1
Step 2: \`bar\` => null
Step 3: \`foo ? bar : baz\` => null
Step 4: \`tata\` => 0
Step 5: \`(foo ? bar : baz) ? toto : tata\` => 0
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('LogicalExpression', () => {
    const actual = renderStepwise('assert(a > 0 || b > 0)', [
      { value: -3, markerPos: 7, startPos: 7, endPos: 8, evalOrder: 1, argIndex: 0 },
      { value: 0, markerPos: 11, startPos: 11, endPos: 12, evalOrder: 2, argIndex: 0 },
      { value: false, markerPos: 9, startPos: 7, endPos: 12, evalOrder: 3, argIndex: 0 },
      { value: -2, markerPos: 16, startPos: 16, endPos: 17, evalOrder: 4, argIndex: 0 },
      { value: 0, markerPos: 20, startPos: 20, endPos: 21, evalOrder: 5, argIndex: 0 },
      { value: false, markerPos: 18, startPos: 16, endPos: 21, evalOrder: 6, argIndex: 0 },
      { value: false, markerPos: 13, startPos: 7, endPos: 21, evalOrder: 7, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`a\` => -3
Step 2: \`0\` => 0
Step 3: \`a > 0\` => false
Step 4: \`b\` => -2
Step 5: \`0\` => 0
Step 6: \`b > 0\` => false
Step 7: \`a > 0 || b > 0\` => false
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('multiple arguments', () => {
    const actual = renderStepwise("assert.equal(truthy,\n  falsy,\n  'falsy is not truthy')", [
      { value: '1', markerPos: 13, startPos: 13, endPos: 19, evalOrder: 1, argIndex: 0 },
      { value: 0, markerPos: 23, startPos: 23, endPos: 28, evalOrder: 1, argIndex: 1 },
      { value: 'falsy is not truthy', markerPos: 32, startPos: 32, endPos: 53, evalOrder: 1, argIndex: 2 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`truthy\` => "1"
=== arg:1 ===
Step 1: \`falsy\` => 0
=== arg:2 ===
Step 1: \`'falsy is not truthy'\` => "falsy is not truthy"
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('empty logs', () => {
    const actual = renderStepwise('assert(true)', []);
    assert.equal(actual, '');
  });

  it('sorts by evalOrder within argument', () => {
    const actual = renderStepwise('assert(a + b)', [
      { value: 3, markerPos: 9, startPos: 7, endPos: 12, evalOrder: 3, argIndex: 0 },
      { value: 1, markerPos: 7, startPos: 7, endPos: 8, evalOrder: 1, argIndex: 0 },
      { value: 2, markerPos: 11, startPos: 11, endPos: 12, evalOrder: 2, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`a\` => 1
Step 2: \`b\` => 2
Step 3: \`a + b\` => 3
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  it('sorts arguments by index', () => {
    const actual = renderStepwise('assert.equal(b, a)', [
      { value: 'second', markerPos: 16, startPos: 16, endPos: 17, evalOrder: 1, argIndex: 1 },
      { value: 'first', markerPos: 13, startPos: 13, endPos: 14, evalOrder: 1, argIndex: 0 }
    ]);
    const expected = `
=== arg:0 ===
Step 1: \`b\` => "first"
=== arg:1 ===
Step 1: \`a\` => "second"
`;
    assert.equal('\n' + actual + '\n', expected);
  });

  describe('multiline assertions', () => {
    it('multiline assert.equal', () => {
      const actual = renderStepwise("assert.equal(truthy,\n  falsy,\n  'falsy is not truthy')", [
        { value: '1', markerPos: 13, startPos: 13, endPos: 19, evalOrder: 1, argIndex: 0 },
        { value: 0, markerPos: 23, startPos: 23, endPos: 28, evalOrder: 1, argIndex: 1 },
        { value: 'falsy is not truthy', markerPos: 32, startPos: 32, endPos: 53, evalOrder: 1, argIndex: 2 }
      ]);
      const expected = `
=== arg:0 ===
Step 1: \`truthy\` => "1"
=== arg:1 ===
Step 1: \`falsy\` => 0
=== arg:2 ===
Step 1: \`'falsy is not truthy'\` => "falsy is not truthy"
`;
      assert.equal('\n' + actual + '\n', expected);
    });

    it('multiline BinaryExpression', () => {
      const actual = renderStepwise('assert(truthy\n       ===\n       falsy)', [
        { value: '1', markerPos: 7, startPos: 7, endPos: 13, evalOrder: 1, argIndex: 0, metadata: { hint: 'left' } },
        { value: 0, markerPos: 32, startPos: 32, endPos: 37, evalOrder: 2, argIndex: 0, metadata: { hint: 'right' } },
        { value: false, markerPos: 21, startPos: 7, endPos: 37, evalOrder: 3, argIndex: 0 }
      ]);
      const expected = `
=== arg:0 ===
Step 1: \`truthy\` => "1"
Step 2: \`falsy\` => 0
Step 3: \`truthy
       ===
       falsy\` => false
`;
      assert.equal('\n' + actual + '\n', expected);
    });
  });
});
