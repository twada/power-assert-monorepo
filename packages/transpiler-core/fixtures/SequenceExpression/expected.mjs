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
_pasrt1.run(_parg1.rec((_parg1.tap(2, 8, 8, 9), _parg1.tap(1, 11, 11, 12), _parg1.tap(0, 14, 14, 15))));
_pasrt2.run(_parg2.rec((_parg2.tap(foo, 8, 8, 11), _parg2.tap(bar, 13, 13, 16)) === _parg2.tap(baz, 22, 22, 25, {
  hint: "right"
}), 18, 7, 25));
_pasrt3.run(_parg3.rec(toto((_parg3.tap(tata, 13, 13, 17), _parg3.tap(titi, 19, 19, 23))), 7, 7, 25));
_pasrt4.run(_parg4.rec((_parg4.tap(foo, 8, 8, 11), (_parg4.tap(bar, 14, 14, 17), _parg4.tap(baz, 19, 19, 22)))));
_pasrt5.run(_parg5.rec((((((_parg5.tap(foo, 12, 12, 15), _parg5.tap(bar, 17, 17, 20)), _parg5.tap(baz, 23, 23, 26)), _parg5.tap(toto, 29, 29, 33)), _parg5.tap(tata, 36, 36, 40)), _parg5.tap(titi, 43, 43, 47))));
_pasrt6.run(_parg6.rec((_parg6.tap(y = _parg6.tap(x, 12, 12, 13), 10, 8, 13), _parg6.tap(z, 15, 15, 16))));
