import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(obj == {...obj})", {
  binexp: "=="
});
const _parg1 = _pasrt1.recorder(0);
_pasrt1.run(_parg1.rec(_parg1.tap(obj, 7) == _parg1.tap({
  ..._parg1.tap(obj, 18)
}, 14), 11));
