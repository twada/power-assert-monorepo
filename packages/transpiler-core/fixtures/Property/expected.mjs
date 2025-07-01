import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert({[num]: foo}, 'Computed (dynamic) property names')");
  const _parg1 = _pasrt1.recorder(0);
  const _parg2 = _pasrt1.recorder(1);
  _pasrt1.run(_parg1.rec({
    [_parg1.tap(num, 9, 9, 12)]: _parg1.tap(foo, 15, 15, 18)
  }, 7, 7, 19), _parg2.rec('Computed (dynamic) property names', 21, 21, 56));
}
{
  const _pasrt2 = _power_(assert, null, "assert({[ 'prop_' + foo() ]: 42})");
  const _parg3 = _pasrt2.recorder(0);
  _pasrt2.run(_parg3.rec({
    [_parg3.tap(_parg3.tap('prop_', 10, 10, 17) + _parg3.tap(foo(), 20, 20, 25), 18, 10, 25)]: _parg3.tap(42, 29, 29, 31)
  }, 7, 7, 32));
}
{
  const _pasrt3 = _power_(assert, null, "assert({[`prop_${generate(seed)}`]: foo})");
  const _parg4 = _pasrt3.recorder(0);
  _pasrt3.run(_parg4.rec({
    [_parg4.tap(`prop_${_parg4.tap(generate(_parg4.tap(seed, 26, 26, 30)), 17, 17, 31)}`, 9, 9, 33)]: _parg4.tap(foo, 36, 36, 39)
  }, 7, 7, 40));
}
{
  const _pasrt4 = _power_(assert, null, "assert({foo}, 'shorthand literal itself will not be instrumented')");
  const _parg5 = _pasrt4.recorder(0);
  const _parg6 = _pasrt4.recorder(1);
  _pasrt4.run(_parg5.rec({
    foo
  }, 7, 7, 12), _parg6.rec('shorthand literal itself will not be instrumented', 14, 14, 65));
}
{
  const _pasrt5 = _power_(assert, null, "assert({foo, bar: baz})");
  const _parg7 = _pasrt5.recorder(0);
  _pasrt5.run(_parg7.rec({
    foo,
    bar: _parg7.tap(baz, 18, 18, 21)
  }, 7, 7, 22));
}
