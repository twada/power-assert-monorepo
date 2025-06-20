import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(foo ? bar : baz)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(foo, 7, 7, 10, 1) ? _parg1.tap(bar, 13, 13, 16, 2) : _parg1.tap(baz, 19, 19, 22, 3), 11, 7, 22, 0));
}
{
  const _pasrt2 = _power_(assert, null, "assert(falsy ? truthy : truthy ? anotherFalsy : truthy)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap(falsy, 7, 7, 12, 1) ? _parg2.tap(truthy, 15, 15, 21, 2) : _parg2.tap(_parg2.tap(truthy, 24, 24, 30, 4) ? _parg2.tap(anotherFalsy, 33, 33, 45, 5) : _parg2.tap(truthy, 48, 48, 54, 6), 31, 24, 54, 3), 13, 7, 54, 0));
}
{
  const _pasrt3 = _power_(assert, null, "assert(foo() ? bar.baz : +goo)");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(_parg3.tap(foo(), 7, 7, 12, 1) ? _parg3.tap(_parg3.tap(bar, 15, 15, 18, 3).baz, 19, 15, 22, 2) : _parg3.tap(+_parg3.tap(goo, 26, 26, 29, 5), 25, 25, 29, 4), 13, 7, 29, 0));
}
{
  const _pasrt4 = _power_(assert.equal, assert, "assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)");
  const _parg4 = _pasrt4.recorder(0);
  const _parg5 = _pasrt4.recorder(1);
  _pasrt4.run(_parg4.rec(_parg4.tap(foo, 13, 13, 16, 1) ? _parg4.tap(bar, 19, 19, 22, 2) : _parg4.tap(baz, 25, 25, 28, 3), 17, 13, 28, 0), _parg5.rec(_parg5.tap(falsy, 30, 30, 35, 1) ? _parg5.tap(truthy, 38, 38, 44, 2) : _parg5.tap(_parg5.tap(truthy, 47, 47, 53, 4) ? _parg5.tap(anotherFalsy, 56, 56, 68, 5) : _parg5.tap(truthy, 71, 71, 77, 6), 54, 47, 77, 3), 36, 30, 77, 0));
}
