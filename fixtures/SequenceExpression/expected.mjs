import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert((2, 1, 0))");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert((foo, bar) === baz)", {
  binexp: "==="
});
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert, null, "assert(toto((tata, titi)))");
const _parg3 = _pasrt3.recorder(0);
const _pasrt4 = _power_(assert, null, "assert((foo, (bar, baz)))");
const _parg4 = _pasrt4.recorder(0);
const _pasrt5 = _power_(assert, null, "assert((((((foo, bar), baz), toto), tata), titi))");
const _parg5 = _pasrt5.recorder(0);
const _pasrt6 = _power_(assert, null, "assert((y = x, z))");
const _parg6 = _pasrt6.recorder(0);
_pasrt1.run(_parg1.rec((_parg1.tap(2, "arguments/0/expressions/0", 8), _parg1.tap(1, "arguments/0/expressions/1", 11), _parg1.tap(0, "arguments/0/expressions/2", 14)), "arguments/0"));
_pasrt2.run(_parg2.rec((_parg2.tap(foo, "arguments/0/left/expressions/0", 8), _parg2.tap(bar, "arguments/0/left/expressions/1", 13)) === _parg2.tap(baz, "arguments/0/right", 22), "arguments/0", 18));
_pasrt3.run(_parg3.rec(toto((_parg3.tap(tata, "arguments/0/arguments/0/expressions/0", 13), _parg3.tap(titi, "arguments/0/arguments/0/expressions/1", 19))), "arguments/0", 7));
_pasrt4.run(_parg4.rec((_parg4.tap(foo, "arguments/0/expressions/0", 8), (_parg4.tap(bar, "arguments/0/expressions/1/expressions/0", 14), _parg4.tap(baz, "arguments/0/expressions/1/expressions/1", 19))), "arguments/0"));
_pasrt5.run(_parg5.rec((((((_parg5.tap(foo, "arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/0", 12), _parg5.tap(bar, "arguments/0/expressions/0/expressions/0/expressions/0/expressions/0/expressions/1", 17)), _parg5.tap(baz, "arguments/0/expressions/0/expressions/0/expressions/0/expressions/1", 23)), _parg5.tap(toto, "arguments/0/expressions/0/expressions/0/expressions/1", 29)), _parg5.tap(tata, "arguments/0/expressions/0/expressions/1", 36)), _parg5.tap(titi, "arguments/0/expressions/1", 43)), "arguments/0"));
_pasrt6.run(_parg6.rec((_parg6.tap(y = _parg6.tap(x, "arguments/0/expressions/0/right", 12), "arguments/0/expressions/0", 10), _parg6.tap(z, "arguments/0/expressions/1", 15)), "arguments/0"));
