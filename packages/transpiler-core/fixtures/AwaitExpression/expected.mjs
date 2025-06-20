import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
async function myAsync(a) {
  const _pasrt1 = _power_(assert, null, "assert(await a === 3)", {
    binexp: "==="
  });
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(await a, 7, 7, 14, 1, {
    hint: "left"
  }) === _parg1.tap(3, 19, 19, 20, 2, {
    hint: "right"
  }), 15, 7, 20, 0));
}
