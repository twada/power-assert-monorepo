import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert([foo, bar])");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec([_parg1.tap(foo, 8), _parg1.tap(bar, 13)], 7));
}
{
  const _pasrt2 = _power_(assert, null, "assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number')");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap(typeof _parg2.tap([_parg2.tap([_parg2.tap(_parg2.tap(foo, 16).bar, 20), _parg2.tap(baz(_parg2.tap(moo, 29)), 28)], 15), _parg2.tap(+_parg2.tap(fourStr, 38), 36)], 14), 7) === _parg2.tap('number', 51), 47));
}
{
  const _pasrt3 = _power_(assert.notDeepEqual, assert, "assert.notDeepEqual([foo, bar], [hoge, fuga, piyo])");
  const _parg3 = _pasrt3.recorder(0);
  const _parg4 = _pasrt3.recorder(1);
  _pasrt3.run(_parg3.rec([_parg3.tap(foo, 21), _parg3.tap(bar, 26)], 20), _parg4.rec([_parg4.tap(hoge, 33), _parg4.tap(fuga, 39), _parg4.tap(piyo, 45)], 32));
}
