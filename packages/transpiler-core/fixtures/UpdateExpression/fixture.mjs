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
{
  assert(obj.prop++);
}
{
  assert([a,b][1]++);
}
{
  assert(++(obj.prop));
}
