import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert({foo: bar, hoge: fuga})");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec({
    foo: _parg1.tap(bar, 13, 13, 16, 1),
    hoge: _parg1.tap(fuga, 24, 24, 28, 2)
  }, 7, 7, 29, 0));
}
{
  const _pasrt2 = _power_(assert, null, "assert(!({ foo: bar.baz, name: nameOf({firstName: first, lastName: last}) }))");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(!_parg2.tap({
    foo: _parg2.tap(_parg2.tap(bar, 16, 16, 19, 3).baz, 20, 16, 23, 2),
    name: _parg2.tap(nameOf(_parg2.tap({
      firstName: _parg2.tap(first, 50, 50, 55, 6),
      lastName: _parg2.tap(last, 67, 67, 71, 7)
    }, 38, 38, 72, 5)), 31, 31, 73, 4)
  }, 9, 9, 75, 1), 7, 7, 76, 0));
}
{
  const _pasrt3 = _power_(assert.deepEqual, assert, "assert.deepEqual({foo: bar, hoge: fuga}, {hoge: fuga, foo: bar})");
  const _parg3 = _pasrt3.recorder(0);
  const _parg4 = _pasrt3.recorder(1);
  _pasrt3.run(_parg3.rec({
    foo: _parg3.tap(bar, 23, 23, 26, 1),
    hoge: _parg3.tap(fuga, 34, 34, 38, 2)
  }, 17, 17, 39, 0), _parg4.rec({
    hoge: _parg4.tap(fuga, 48, 48, 52, 1),
    foo: _parg4.tap(bar, 59, 59, 62, 2)
  }, 41, 41, 63, 0));
}
