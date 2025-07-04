import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(hello(...names))");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(hello(..._parg1.tap(names, 16, 16, 21)), 7, 7, 22));
}
{
  const _pasrt2 = _power_(assert, null, "assert([head, ...tail].length)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap([_parg2.tap(head, 8, 8, 12), ..._parg2.tap(tail, 17, 17, 21)], 7, 7, 22).length, 23, 7, 29));
}
{
  const _pasrt3 = _power_(assert, null, "assert(f(head, ...iter(), ...[foo, bar]))");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(f(_parg3.tap(head, 9, 9, 13), ..._parg3.tap(iter(), 18, 18, 24), ..._parg3.tap([_parg3.tap(foo, 30, 30, 33), _parg3.tap(bar, 35, 35, 38)], 29, 29, 39)), 7, 7, 40));
}
{
  assert(...iter());
}
{
  assert(...[foo, bar]);
}
