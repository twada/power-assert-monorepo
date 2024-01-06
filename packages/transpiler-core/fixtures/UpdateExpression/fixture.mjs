import assert from 'node:assert/strict';
{
  assert(++foo);
}
{
  assert(bar--);
}
{
  assert.strictEqual(++foo, bar--);
}
