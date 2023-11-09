import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert([foo, bar])");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number')", {
  binexp: "==="
});
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert.notDeepEqual, assert, "assert.notDeepEqual([foo, bar], [hoge, fuga, piyo])");
const _parg3 = _pasrt3.recorder(0);
const _parg4 = _pasrt3.recorder(1);
_pasrt1.run(_parg1.rec([_parg1.tap(foo, "arguments/0/elements/0", 8), _parg1.tap(bar, "arguments/0/elements/1", 13)], "arguments/0", 7));
_pasrt2.run(_parg2.rec(_parg2.tap(typeof _parg2.tap([_parg2.tap([_parg2.tap(_parg2.tap(foo, "arguments/0/left/argument/elements/0/elements/0/object", 16).bar, "arguments/0/left/argument/elements/0/elements/0", 20), _parg2.tap(baz(_parg2.tap(moo, "arguments/0/left/argument/elements/0/elements/1/arguments/0", 29)), "arguments/0/left/argument/elements/0/elements/1", 28)], "arguments/0/left/argument/elements/0", 15), _parg2.tap(+_parg2.tap(fourStr, "arguments/0/left/argument/elements/1/argument", 38), "arguments/0/left/argument/elements/1", 36)], "arguments/0/left/argument", 14), "arguments/0/left", 7) === _parg2.tap('number', "arguments/0/right", 51), "arguments/0", 47));
_pasrt3.run(_parg3.rec([_parg3.tap(foo, "arguments/0/elements/0", 21), _parg3.tap(bar, "arguments/0/elements/1", 26)], "arguments/0", 20), _parg4.rec([_parg4.tap(hoge, "arguments/1/elements/0", 33), _parg4.tap(fuga, "arguments/1/elements/1", 39), _parg4.tap(piyo, "arguments/1/elements/2", 45)], "arguments/1", 32));
