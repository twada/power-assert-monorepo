import assert from 'node:assert/strict';

{
  assert({[num]: foo}, 'Computed (dynamic) property names');
}
{
  assert({[ 'prop_' + foo() ]: 42});
}
{
  assert({[`prop_${generate(seed)}`]: foo});
}
{
  assert({foo}, 'shorthand literal itself will not be instrumented');
}
{
  assert({foo, bar: baz});
}
