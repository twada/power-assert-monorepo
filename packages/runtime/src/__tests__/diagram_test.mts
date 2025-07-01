import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { renderDiagram } from '../diagram.mjs';

describe('renderDiagram', () => {
  it('BinaryExpression', () => {
    const diagram = renderDiagram('assert.ok(truthy === falsy)', [
      { value: '1', markerPos: 10 },
      { value: 0, markerPos: 21 },
      { value: false, markerPos: 17 }
    ]);
    const expected = `
assert.ok(truthy === falsy)
          |      |   |
          |      |   0
          |      false
          "1"
`;
    assert.equal('\n' + diagram + '\n', expected);
  });

  it('rendering kanji', () => {
    const diagram = renderDiagram('assert(a === b)', [
      { value: '𠮷', markerPos: 7 },
      { value: 'ab', markerPos: 13 },
      { value: false, markerPos: 9 }
    ]);
    const expected = `
assert(a === b)
       | |   |
       | |   "ab"
       | false
       "𠮷"
`;
    assert.equal('\n' + diagram + '\n', expected);
  });

  it('rendering combining character', () => {
    const diagram = renderDiagram('assert(a === b)', [
      { value: 'a\u0300b', markerPos: 7 },
      { value: 'ab', markerPos: 13 },
      { value: false, markerPos: 9 }
    ]);
    const expected = `
assert(a === b)
       | |   |
       | |   "ab"
       | false
       "àb"
`;
    assert.equal('\n' + diagram + '\n', expected);
  });
});
