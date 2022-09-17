import assert, { deepStrictEqual } from 'assert';

function add(a, b) {
  const expected = {b, a};
  deepStrictEqual({a, b: b}, expected);
  assert(typeof a === 'number');
  assert(typeof b === 'number');
  return a + b;
}
