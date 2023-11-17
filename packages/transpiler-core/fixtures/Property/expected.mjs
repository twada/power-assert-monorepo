import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert({[num]: foo})");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert({[ 'prop_' + (() => bar())() ]: 42})");
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert, null, "assert({[`prop_${generate(seed)}`]: foo})");
const _parg3 = _pasrt3.recorder(0);
const _pasrt4 = _power_(assert, null, "assert({foo})");
const _parg4 = _pasrt4.recorder(0);
const _pasrt5 = _power_(assert, null, "assert({foo, bar: baz})");
const _parg5 = _pasrt5.recorder(0);
_pasrt1.run(_parg1.rec({
  [_parg1.tap(num, 9)]: _parg1.tap(foo, 15)
}, 7));
_pasrt2.run(_parg2.rec({
  [_parg2.tap(_parg2.tap('prop_', 10) + _parg2.tap((() => bar())(), 33), 18)]: _parg2.tap(42, 39)
}, 7));
_pasrt3.run(_parg3.rec({
  [_parg3.tap(`prop_${_parg3.tap(generate(_parg3.tap(seed, 26)), 25)}`, 9)]: _parg3.tap(foo, 36)
}, 7));
_pasrt4.run(_parg4.rec({
  foo
}, 7));
_pasrt5.run(_parg5.rec({
  foo,
  bar: _parg5.tap(baz, 18)
}, 7));
