import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(++foo)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(++foo, 7, 7, 12, 0));
}
{
  const _pasrt2 = _power_(assert, null, "assert(bar--)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(bar--, 10, 7, 12, 0));
}
{
  const _pasrt3 = _power_(assert.strictEqual, assert, "assert.strictEqual(++foo, bar--)");
  const _parg3 = _pasrt3.recorder(0);
  const _parg4 = _pasrt3.recorder(1);
  _pasrt3.run(_parg3.rec(++foo, 19, 19, 24, 0), _parg4.rec(bar--, 29, 26, 31, 0));
}
{
  const _pasrt4 = _power_(assert, null, "assert(obj.prop++)");
  const _parg5 = _pasrt4.recorder(0);
  _pasrt4.run(_parg5.rec(_parg5.tap(obj, 7, 7, 10, 1).prop++, 15, 7, 17, 0));
}
{
  const _pasrt5 = _power_(assert, null, "assert([a,b][1]++)");
  const _parg6 = _pasrt5.recorder(0);
  _pasrt5.run(_parg6.rec(_parg6.tap([_parg6.tap(a, 8, 8, 9, 2), _parg6.tap(b, 10, 10, 11, 3)], 7, 7, 12, 1)[_parg6.tap(1, 13, 13, 14, 4)]++, 15, 7, 17, 0));
}
{
  const _pasrt6 = _power_(assert, null, "assert(++(obj.prop))");
  const _parg7 = _pasrt6.recorder(0);
  _pasrt6.run(_parg7.rec(++_parg7.tap(obj, 10, 10, 13, 1).prop, 7, 7, 19, 0));
}
