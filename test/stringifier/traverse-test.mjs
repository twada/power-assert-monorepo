import test from 'node:test';
import { strict as assert } from 'node:assert';
import { traverseAny } from '../../dist/runtime/stringifier/traverse.mjs';

test('traverse flat array', () => {
  const acc = [];
  traverseAny(['a', 'b'], (item, state) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    acc.push(item);
  });
  assert.deepEqual(acc, [['a', 'b'], 'a', 'b']);
});

test('traverse Map', () => {
  const map = new Map();
  map.set('key1', 'a');
  map.set('key2', 'b');
  const acc = [];
  traverseAny(map, (item, state) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    acc.push(item);
  });
  assert.deepEqual(acc, [map, 'a', 'b']);
});

test('state.bailOut', () => {
  const acc = [];
  traverseAny(['a', 'b', 'c'], (item, state) => {
    // console.log(item);
    if (acc.length === 2) {
      state.bailOut();
    }
    acc.push(item);
  });
  assert.deepEqual(acc, [['a', 'b', 'c'], 'a']);
});
