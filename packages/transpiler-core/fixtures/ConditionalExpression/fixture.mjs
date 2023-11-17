import assert from 'node:assert';
{
  assert(foo ? bar : baz);
}
{
  assert(falsy ? truthy : truthy ? anotherFalsy : truthy);
}
{
  assert(foo() ? bar.baz : +goo);
}
{
  assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy);
}
