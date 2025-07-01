import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(fuga !== 'ふが')", {
    binexp: "!=="
  });
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(fuga, 7, 7, 11, {
    hint: "left"
  }) !== _parg1.tap('ふが', 16, 16, 20, {
    hint: "right"
  }), 12, 7, 20));
}
{
  const _pasrt2 = _power_(assert, null, "assert('ほげ' !== 'ふが')", {
    binexp: "!=="
  });
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap('ほげ', 7, 7, 11, {
    hint: "left"
  }) !== _parg2.tap('ふが', 16, 16, 20, {
    hint: "right"
  }), 12, 7, 20));
}
