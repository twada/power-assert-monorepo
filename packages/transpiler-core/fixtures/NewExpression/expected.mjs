import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(new Date())");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(new Date(), 7));
}
{
  const _pasrt2 = _power_(assert, null, "assert(new foo.bar.Baz())");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(new (_parg2.tap(_parg2.tap(foo, 11).bar, 15).Baz)(), 7));
}
{
  const _pasrt3 = _power_(assert, null, "assert(!(new Array(foo, bar, baz)))");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(!_parg3.tap(new Array(_parg3.tap(foo, 19), _parg3.tap(bar, 24), _parg3.tap(baz, 29)), 9), 7));
}
{
  const _pasrt4 = _power_(assert.notEqual, assert, "assert.notEqual(new Date(), new Date('2013-01-12'))");
  const _parg4 = _pasrt4.recorder(0);
  const _parg5 = _pasrt4.recorder(1);
  _pasrt4.run(_parg4.rec(new Date(), 16), _parg5.rec(new Date(_parg5.tap('2013-01-12', 37)), 28));
}
