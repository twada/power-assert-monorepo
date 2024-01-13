import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(!truth)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(!_parg1.tap(truth, 8), 7));
}
{
  const _pasrt2 = _power_(assert, null, "assert(!!some)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(!_parg2.tap(!_parg2.tap(some, 9), 8), 7));
}
{
  const _pasrt3 = _power_(assert, null, "assert(!!foo.bar)");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(!_parg3.tap(!_parg3.tap(_parg3.tap(foo, 9).bar, 13), 8), 7));
}
{
  const _pasrt4 = _power_(assert, null, "assert(delete foo.bar)");
  const _parg4 = _pasrt4.recorder(0);
  _pasrt4.run(_parg4.rec(delete _parg4.tap(_parg4.tap(foo, 14).bar, 18), 7));
}
{
  const _pasrt5 = _power_(assert, null, "assert(typeof foo !== 'undefined')", {
    binexp: "!=="
  });
  const _parg5 = _pasrt5.recorder(0);
  _pasrt5.run(_parg5.rec(_parg5.tap(typeof foo, 7, {
    hint: "left"
  }) !== _parg5.tap('undefined', 22, {
    hint: "right"
  }), 18));
}
{
  const _pasrt6 = _power_(assert, null, "assert(typeof foo.bar !== 'undefined')", {
    binexp: "!=="
  });
  const _parg6 = _pasrt6.recorder(0);
  _pasrt6.run(_parg6.rec(_parg6.tap(typeof _parg6.tap(_parg6.tap(foo, 14).bar, 18), 7, {
    hint: "left"
  }) !== _parg6.tap('undefined', 26, {
    hint: "right"
  }), 22));
}
{
  const _pasrt7 = _power_(assert.strictEqual, assert, "assert.strictEqual(typeof foo, typeof bar)");
  const _parg7 = _pasrt7.recorder(0);
  const _parg8 = _pasrt7.recorder(1);
  _pasrt7.run(_parg7.rec(typeof foo, 19), _parg8.rec(typeof bar, 31));
}
