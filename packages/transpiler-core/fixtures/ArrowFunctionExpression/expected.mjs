import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(v => v + 1)");
const _pasrt2 = _power_(assert, null, "assert((v, i) => v + i)");
const _pasrt3 = _power_(assert, null, "assert(v => ({even: v, odd: v + 1}))");
const _pasrt4 = _power_(assert, null, "assert(seven === ((v, i) => v + i)(four, five))");
const _parg1 = _pasrt4.recorder(0);
const _pasrt5 = _power_(assert, null, "assert(user.name === 'Bob')");
const _parg2 = _pasrt5.recorder(0);
assert(v => v + 1);
assert((v, i) => v + i);
assert(v => ({
  even: v,
  odd: v + 1
}));
_pasrt4.run(_parg1.rec(_parg1.tap(seven, 7) === _parg1.tap(((v, i) => v + i)(_parg1.tap(four, 35), _parg1.tap(five, 41)), 34), 13));
test('test name', () => _pasrt5.run(_parg2.rec(_parg2.tap(_parg2.tap(user, 7).name, 12) === _parg2.tap('Bob', 21), 17)));
test('promise', () => {
  const _pasrt6 = _power_(assert, null, "assert(true === false)");
  const _parg3 = _pasrt6.recorder(0);
  return Promise.resolve().then(() => _pasrt6.run(_parg3.rec(_parg3.tap(true, 7) === _parg3.tap(false, 16), 12)));
});
