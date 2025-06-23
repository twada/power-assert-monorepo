import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
for (var i = 0; i < 3; i += 1) {
  if (foo) {
    const _pasrt1 = _power_(assert, null, "assert(foo === 'FOO')", {
      binexp: "==="
    });
    const _parg1 = _pasrt1.recorder(0);
    _pasrt1.run(_parg1.rec(_parg1.tap(foo, 7, 7, 10, {
      hint: "left"
    }) === _parg1.tap('FOO', 15, 15, 20, {
      hint: "right"
    }), 11, 7, 20));
  } else {
    const _pasrt2 = _power_(assert, null, "assert(bar)");
    const _parg2 = _pasrt2.recorder(0);
    _pasrt2.run(_parg2.rec(bar, 7, 7, 10));
  }
}
