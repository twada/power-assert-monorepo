import assert from 'node:assert/strict';

{
  assert(hello(...names));
}
{
  assert([head, ...tail].length);
}
{
  assert(f(head, ...iter(), ...[foo, bar]));
}
{
  assert(...iter());
}
{
  assert(...[foo, bar]);
}
