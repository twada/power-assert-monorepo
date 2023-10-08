import {_power_} from "@power-assert/runtime";
import assert from 'node:assert/strict';
async function myAsync(a) {
  const _pasrt1 = _power_(assert, null, "assert((await (a)) === 3)", {
    binexp: "==="
  });
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(await a, "arguments/0/left", 8) === _parg1.tap(3, "arguments/0/right", 23), "arguments/0", 19));
}
