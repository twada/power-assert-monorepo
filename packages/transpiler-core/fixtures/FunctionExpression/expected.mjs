import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(function (a, b) { return a + b; })");
const _pasrt2 = _power_(assert, null, "assert(baz === (function (a, b) { return a + b; })(foo, bar))");
const _parg1 = _pasrt2.recorder(0);
assert(function (a, b) {
  return a + b;
});
_pasrt2.run(_parg1.rec(_parg1.tap(baz, 7) === _parg1.tap((function (a, b) {
  return a + b;
})(_parg1.tap(foo, 51), _parg1.tap(bar, 56)), 50), 11));
