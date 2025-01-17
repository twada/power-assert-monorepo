import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { traverseAny } from '../../stringifier/traverse.mjs';

describe('traverse', () => {
  it('traverse flat array', () => {
    const acc: unknown[] = [];
    traverseAny(['a', 'b'], (item, state) => {
      acc.push(item);
    });
    assert.deepEqual(acc, [['a', 'b'], 'a', 'b']);
  });

  it('traverse Map', () => {
    const map = new Map();
    map.set('key1', 'a');
    map.set('key2', 'b');
    const acc: unknown[] = [];
    traverseAny(map, (item, state) => {
      acc.push(item);
    });
    assert.deepEqual(acc, [map, 'a', 'b']);
  });

  it('state.bailOut', () => {
    const acc: unknown[] = [];
    traverseAny(['a', 'b', 'c'], (item, state) => {
      // console.log(item);
      if (acc.length === 2) {
        state.bailOut();
      }
      acc.push(item);
    });
    assert.deepEqual(acc, [['a', 'b', 'c'], 'a']);
  });
});
