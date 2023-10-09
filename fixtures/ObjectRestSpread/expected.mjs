import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(obj == {...obj})", {
  binexp: "=="
});
const _parg1 = _pasrt1.recorder(0);
_pasrt1.run(_parg1.rec(_parg1.tap(obj, "arguments/0/left", 7) == _parg1.tap({
  ..._parg1.tap(obj, "arguments/0/right/properties/0/argument", 18)
}, "arguments/0/right", 14), "arguments/0", 11));
