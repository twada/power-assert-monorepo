import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(new foo.bar.Baz())");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(new (_parg1.tap(_parg1.tap(foo, 11).bar, 15)).Baz(), 7));
}
