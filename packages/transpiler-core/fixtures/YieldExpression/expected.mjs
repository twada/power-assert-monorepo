import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
function* gen(a) {
  const _pasrt1 = _power_(assert, null, "assert((yield (a)) === 3)", {
    binexp: "==="
  });
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(yield a, 8, {
    hint: "left"
  }) === _parg1.tap(3, 23, {
    hint: "right"
  }), 19));
}
