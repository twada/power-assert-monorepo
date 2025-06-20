import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(v => v + 1)");
const _pasrt2 = _power_(assert, null, "assert((v, i) => v + i)");
const _pasrt3 = _power_(assert, null, "assert(v => ({even: v, odd: v + 1}))");
const _pasrt4 = _power_(assert, null, "assert(seven === ((v, i) => v + i)(four, five))", {
  binexp: "==="
});
const _parg1 = _pasrt4.recorder(0);
const _pasrt5 = _power_(assert, null, "assert(user.name === 'Bob')", {
  binexp: "==="
});
const _parg2 = _pasrt5.recorder(0);
assert(v => v + 1);
assert((v, i) => v + i);
assert(v => ({
  even: v,
  odd: v + 1
}));
_pasrt4.run(_parg1.rec(_parg1.tap(seven, 7, 7, 12, 1, {
  hint: "left"
}) === _parg1.tap(((v, i) => v + i)(_parg1.tap(four, 35, 35, 39, 3), _parg1.tap(five, 41, 41, 45, 4)), 34, 17, 46, 2, {
  hint: "right"
}), 13, 7, 46, 0));
test('test name', () => _pasrt5.run(_parg2.rec(_parg2.tap(_parg2.tap(user, 7, 7, 11, 2).name, 12, 7, 16, 1, {
  hint: "left"
}) === _parg2.tap('Bob', 21, 21, 26, 3, {
  hint: "right"
}), 17, 7, 26, 0)));
test('promise', () => {
  const _pasrt6 = _power_(assert, null, "assert(true === false)", {
    binexp: "==="
  });
  const _parg3 = _pasrt6.recorder(0);
  return Promise.resolve().then(() => _pasrt6.run(_parg3.rec(_parg3.tap(true, 7, 7, 11, 1, {
    hint: "left"
  }) === _parg3.tap(false, 16, 16, 21, 2, {
    hint: "right"
  }), 12, 7, 21, 0)));
});
