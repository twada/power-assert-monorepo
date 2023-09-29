import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { DiagramRenderer } from '../../../dist/runtime/diagram-renderer.mjs';

describe('DiagramRenderer', () => {
  it('BinaryExpression', () => {
    const diagram = new DiagramRenderer('assert.ok(truthy === falsy)');
    const logs = [
      { value: '1', leftIndex: 10 },
      { value: 0, leftIndex: 21 },
      { value: false, leftIndex: 17 }
    ];
    const expected = `
assert.ok(truthy === falsy)
          |      |   |     
          |      |   0     
          "1"    false     
`;
    assert.equal('\n' + diagram.render(logs) + '\n', expected);
  });

  it('rendering kanji', () => {
    const diagram = new DiagramRenderer('assert(a === b)');
    const logs = [
      { value: '𠮷', leftIndex: 7 },
      { value: 'ab', leftIndex: 13 },
      { value: false, leftIndex: 9 }
    ];
    const expected = `
assert(a === b)
       | |   | 
       | |   "ab"
       | false 
       "𠮷"    
`;
    assert.equal('\n' + diagram.render(logs) + '\n', expected);
  });

  it('rendering combining character', () => {
    const diagram = new DiagramRenderer('assert(a === b)');
    const logs = [
      { value: 'a\u0300b', leftIndex: 7 },
      { value: 'ab', leftIndex: 13 },
      { value: false, leftIndex: 9 }
    ];
    const expected = `
assert(a === b)
       | |   | 
       | |   "ab"
       | false 
       "àb"    
`;
    assert.equal('\n' + diagram.render(logs) + '\n', expected);
  });
});
