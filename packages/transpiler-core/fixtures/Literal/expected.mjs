import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
{
  const _pasrt1 = _power_(assert, null, "assert(false)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(false, 7));
}
{
  const _pasrt2 = _power_(assert, null, "assert(0)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(0, 7));
}
{
  const _pasrt3 = _power_(assert.equal, assert, "assert.equal(1, 0)");
  const _parg3 = _pasrt3.recorder(0);
  const _parg4 = _pasrt3.recorder(1);
  _pasrt3.run(_parg3.rec(1, 13), _parg4.rec(0, 16));
}
{
  const _pasrt4 = _power_(assert, null, "assert(false, 'message')");
  const _parg5 = _pasrt4.recorder(0);
  const _parg6 = _pasrt4.recorder(1);
  _pasrt4.run(_parg5.rec(false, 7), _parg6.rec('message', 14));
}
{
  const _pasrt5 = _power_(assert, null, "assert(false, messageStr)");
  const _parg7 = _pasrt5.recorder(0);
  const _parg8 = _pasrt5.recorder(1);
  _pasrt5.run(_parg7.rec(false, 7), _parg8.rec(messageStr, 14));
}
{
  const _pasrt6 = _power_(assert.equal, assert, "assert.equal(foo, 'bar', 'msg')");
  const _parg9 = _pasrt6.recorder(0);
  const _parg10 = _pasrt6.recorder(1);
  const _parg11 = _pasrt6.recorder(2);
  _pasrt6.run(_parg9.rec(foo, 13), _parg10.rec('bar', 18), _parg11.rec('msg', 25));
}
{
  const _pasrt7 = _power_(assert, null, "assert(/^not/.exec(str))");
  const _parg12 = _pasrt7.recorder(0);
  _pasrt7.run(_parg12.rec(_parg12.tap(/^not/, 7).exec(_parg12.tap(str, 19)), 14));
}
{
  const _pasrt8 = _power_(assert, null, "assert(0b111110111)");
  const _parg13 = _pasrt8.recorder(0);
  _pasrt8.run(_parg13.rec(0b111110111, 7));
}
{
  const _pasrt9 = _power_(assert, null, "assert(0o767)");
  const _parg14 = _pasrt9.recorder(0);
  _pasrt9.run(_parg14.rec(0o767, 7));
}
