import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(new Date())");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(new Date(), 7));
}
{
  const _pasrt2 = _power_(assert, null, "assert(!(new Array(foo, bar, baz)))");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(!_parg2.tap(new Array(_parg2.tap(foo, 19), _parg2.tap(bar, 24), _parg2.tap(baz, 29)), 9), 7));
}
{
  const _pasrt3 = _power_(assert.notEqual, assert, "assert.notEqual(new Date(), new Date('2013-01-12'))");
  const _parg3 = _pasrt3.recorder(0);
  const _parg4 = _pasrt3.recorder(1);
  _pasrt3.run(_parg3.rec(new Date(), 16), _parg4.rec(new Date(_parg4.tap('2013-01-12', 37)), 28));
}
