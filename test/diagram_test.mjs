import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DiagramRenderer } from '../dist/runtime/diagram-renderer.mjs';

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
    assert.equal(diagram.render(logs), expected);
  });
});
