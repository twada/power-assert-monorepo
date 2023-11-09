import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert({foo: bar, hoge: fuga})");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert(!({ foo: bar.baz, name: nameOf({firstName: first, lastName: last}) }))");
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert.deepEqual, assert, "assert.deepEqual({foo: bar, hoge: fuga}, {hoge: fuga, foo: bar})");
const _parg3 = _pasrt3.recorder(0);
const _parg4 = _pasrt3.recorder(1);
_pasrt1.run(_parg1.rec({
  foo: _parg1.tap(bar, "arguments/0/properties/0/value", 13),
  hoge: _parg1.tap(fuga, "arguments/0/properties/1/value", 24)
}, "arguments/0", 7));
_pasrt2.run(_parg2.rec(!_parg2.tap({
  foo: _parg2.tap(_parg2.tap(bar, "arguments/0/argument/properties/0/value/object", 16).baz, "arguments/0/argument/properties/0/value", 20),
  name: _parg2.tap(nameOf(_parg2.tap({
    firstName: _parg2.tap(first, "arguments/0/argument/properties/1/value/arguments/0/properties/0/value", 50),
    lastName: _parg2.tap(last, "arguments/0/argument/properties/1/value/arguments/0/properties/1/value", 67)
  }, "arguments/0/argument/properties/1/value/arguments/0", 38)), "arguments/0/argument/properties/1/value", 37)
}, "arguments/0/argument", 9), "arguments/0", 7));
_pasrt3.run(_parg3.rec({
  foo: _parg3.tap(bar, "arguments/0/properties/0/value", 23),
  hoge: _parg3.tap(fuga, "arguments/0/properties/1/value", 34)
}, "arguments/0", 17), _parg4.rec({
  hoge: _parg4.tap(fuga, "arguments/1/properties/0/value", 48),
  foo: _parg4.tap(bar, "arguments/1/properties/1/value", 59)
}, "arguments/1", 41));
