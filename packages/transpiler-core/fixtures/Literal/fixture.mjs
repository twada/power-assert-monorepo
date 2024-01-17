import assert from 'node:assert/strict';

{
  assert(false);
}
{
  assert(0);
}
{
  assert.equal(1, 0);
}
{
  assert(false, 'message');
}
{
  assert(false, messageStr);
}
{
  assert.equal(foo, 'bar', 'msg');
}
{
  assert(/^not/.exec(str));
}
{
  assert(0b111110111);
}
{
  assert(0o767);
}
