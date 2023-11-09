import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(false)");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert(0)");
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert.equal, assert, "assert.equal(1, 0)");
const _parg3 = _pasrt3.recorder(0);
const _parg4 = _pasrt3.recorder(1);
const _pasrt4 = _power_(assert, null, "assert(false, 'message')");
const _parg5 = _pasrt4.recorder(0);
const _parg6 = _pasrt4.recorder(1);
const _pasrt5 = _power_(assert, null, "assert(false, messageStr)");
const _parg7 = _pasrt5.recorder(0);
const _parg8 = _pasrt5.recorder(1);
const _pasrt6 = _power_(assert.equal, assert, "assert.equal(foo, 'bar', 'msg')");
const _parg9 = _pasrt6.recorder(0);
const _parg10 = _pasrt6.recorder(1);
const _parg11 = _pasrt6.recorder(2);
const _pasrt7 = _power_(assert, null, "assert(/^not/.exec(str))");
const _parg12 = _pasrt7.recorder(0);
const _pasrt8 = _power_(assert, null, "assert(fuga !== 'ふが')", {
  binexp: "!=="
});
const _parg13 = _pasrt8.recorder(0);
const _pasrt9 = _power_(assert, null, "assert('ほげ' !== 'ふが')", {
  binexp: "!=="
});
const _parg14 = _pasrt9.recorder(0);
const _pasrt10 = _power_(assert, null, "assert(0b111110111)");
const _parg15 = _pasrt10.recorder(0);
const _pasrt11 = _power_(assert, null, "assert(0o767)");
const _parg16 = _pasrt11.recorder(0);
_pasrt1.run(_parg1.rec(false, "arguments/0", 7));
_pasrt2.run(_parg2.rec(0, "arguments/0", 7));
_pasrt3.run(_parg3.rec(1, "arguments/0", 13), _parg4.rec(0, "arguments/1", 16));
_pasrt4.run(_parg5.rec(false, "arguments/0", 7), _parg6.rec('message', "arguments/1", 14));
_pasrt5.run(_parg7.rec(false, "arguments/0", 7), _parg8.rec(messageStr, "arguments/1", 14));
_pasrt6.run(_parg9.rec(foo, "arguments/0", 13), _parg10.rec('bar', "arguments/1", 18), _parg11.rec('msg', "arguments/2", 25));
_pasrt7.run(_parg12.rec(_parg12.tap(/^not/, "arguments/0/callee/object", 7).exec(_parg12.tap(str, "arguments/0/arguments/0", 19)), "arguments/0", 18));
_pasrt8.run(_parg13.rec(_parg13.tap(fuga, "arguments/0/left", 7) !== _parg13.tap('ふが', "arguments/0/right", 16), "arguments/0", 12));
_pasrt9.run(_parg14.rec(_parg14.tap('ほげ', "arguments/0/left", 7) !== _parg14.tap('ふが', "arguments/0/right", 16), "arguments/0", 12));
_pasrt10.run(_parg15.rec(0b111110111, "arguments/0", 7));
_pasrt11.run(_parg16.rec(0o767, "arguments/0", 7));
