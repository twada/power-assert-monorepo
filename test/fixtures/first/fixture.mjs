import assert, { deepStrictEqual } from 'assert';

function add(a, b) {
  const expected = {b, a};
  deepStrictEqual({a, b: b}, expected);
  assert(typeof a === 'number');
  assert.is.ok(typeof a === 'number');
  assert.equal(typeof b, 'number');
  return a + b;
}
