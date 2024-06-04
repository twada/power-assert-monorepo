import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(foo ? bar : baz)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(foo, 7) ? _parg1.tap(bar, 13) : _parg1.tap(baz, 19), 11));
}
{
  const _pasrt2 = _power_(assert, null, "assert(falsy ? truthy : truthy ? anotherFalsy : truthy)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap(falsy, 7) ? _parg2.tap(truthy, 15) : _parg2.tap(_parg2.tap(truthy, 24) ? _parg2.tap(anotherFalsy, 33) : _parg2.tap(truthy, 48), 31), 13));
}
{
  const _pasrt3 = _power_(assert, null, "assert(foo() ? bar.baz : +goo)");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(_parg3.tap(foo(), 7) ? _parg3.tap(_parg3.tap(bar, 15).baz, 19) : _parg3.tap(+_parg3.tap(goo, 26), 25), 13));
}
{
  const _pasrt4 = _power_(assert.equal, assert, "assert.equal(foo ? bar : baz, falsy ? truthy : truthy ? anotherFalsy : truthy)");
  const _parg4 = _pasrt4.recorder(0);
  const _parg5 = _pasrt4.recorder(1);
  _pasrt4.run(_parg4.rec(_parg4.tap(foo, 13) ? _parg4.tap(bar, 19) : _parg4.tap(baz, 25), 17), _parg5.rec(_parg5.tap(falsy, 30) ? _parg5.tap(truthy, 38) : _parg5.tap(_parg5.tap(truthy, 47) ? _parg5.tap(anotherFalsy, 56) : _parg5.tap(truthy, 71), 54), 36));
}
