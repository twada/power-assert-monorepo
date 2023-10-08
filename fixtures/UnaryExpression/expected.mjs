import {_power_} from "@power-assert/runtime";
const _pasrt1 = _power_(assert, null, "assert(!truth)");
const _parg1 = _pasrt1.recorder(0);
const _pasrt2 = _power_(assert, null, "assert(!!some)");
const _parg2 = _pasrt2.recorder(0);
const _pasrt3 = _power_(assert, null, "assert(!!foo.bar)");
const _parg3 = _pasrt3.recorder(0);
const _pasrt4 = _power_(assert, null, "assert(delete foo.bar)");
const _parg4 = _pasrt4.recorder(0);
const _pasrt5 = _power_(assert, null, "assert(typeof foo !== 'undefined')", {
  binexp: "!=="
});
const _parg5 = _pasrt5.recorder(0);
const _pasrt6 = _power_(assert, null, "assert(typeof foo.bar !== 'undefined')", {
  binexp: "!=="
});
const _parg6 = _pasrt6.recorder(0);
const _pasrt7 = _power_(assert.strictEqual, assert, "assert.strictEqual(typeof foo, typeof bar)");
const _parg7 = _pasrt7.recorder(0);
const _parg8 = _pasrt7.recorder(1);
import assert from 'node:assert/strict';
_pasrt1.run(_parg1.rec(!_parg1.tap(truth, "arguments/0/argument", 8), "arguments/0", 7));
_pasrt2.run(_parg2.rec(!_parg2.tap(!_parg2.tap(some, "arguments/0/argument/argument", 9), "arguments/0/argument", 8), "arguments/0", 7));
_pasrt3.run(_parg3.rec(!_parg3.tap(!_parg3.tap(_parg3.tap(foo, "arguments/0/argument/argument/object", 9).bar, "arguments/0/argument/argument", 13), "arguments/0/argument", 8), "arguments/0", 7));
_pasrt4.run(_parg4.rec(delete _parg4.tap(_parg4.tap(foo, "arguments/0/argument/object", 14).bar, "arguments/0/argument", 18), "arguments/0", 7));
_pasrt5.run(_parg5.rec(_parg5.tap(typeof foo, "arguments/0/left", 7) !== _parg5.tap('undefined', "arguments/0/right", 22), "arguments/0", 18));
_pasrt6.run(_parg6.rec(_parg6.tap(typeof _parg6.tap(_parg6.tap(foo, "arguments/0/left/argument/object", 14).bar, "arguments/0/left/argument", 18), "arguments/0/left", 7) !== _parg6.tap('undefined', "arguments/0/right", 26), "arguments/0", 22));
_pasrt7.run(_parg7.rec(typeof foo, "arguments/0", 19), _parg8.rec(typeof bar, "arguments/1", 31));
