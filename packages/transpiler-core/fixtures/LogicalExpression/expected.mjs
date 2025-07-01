import {it} from 'node:test';
import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
const zero = 0;
const ten = 0;
it('logical AND', () => {
  const _pasrt1 = _power_(assert, null, "assert(5 < zero && zero < 13)");
  const _parg1 = _pasrt1.recorder(0);
  _pasrt1.run(_parg1.rec(_parg1.tap(_parg1.tap(5, 7, 7, 8) < _parg1.tap(zero, 11, 11, 15), 9, 7, 15) && _parg1.tap(_parg1.tap(zero, 19, 19, 23) < _parg1.tap(13, 26, 26, 28), 24, 19, 28), 16, 7, 28));
});
it('logical OR', () => {
  const _pasrt2 = _power_(assert, null, "assert(ten < 5 || 13 < ten)");
  const _parg2 = _pasrt2.recorder(0);
  _pasrt2.run(_parg2.rec(_parg2.tap(_parg2.tap(ten, 7, 7, 10) < _parg2.tap(5, 13, 13, 14), 11, 7, 14) || _parg2.tap(_parg2.tap(13, 18, 18, 20) < _parg2.tap(ten, 23, 23, 26), 21, 18, 26), 15, 7, 26));
});
it('logical AND with parentheses', () => {
  const _pasrt3 = _power_(assert, null, "assert((5 < zero) && (zero < 13))");
  const _parg3 = _pasrt3.recorder(0);
  _pasrt3.run(_parg3.rec(_parg3.tap(_parg3.tap(5, 8, 8, 9) < _parg3.tap(zero, 12, 12, 16), 10, 8, 16) && _parg3.tap(_parg3.tap(zero, 22, 22, 26) < _parg3.tap(13, 29, 29, 31), 27, 22, 31), 18, 7, 32));
});
it('logical OR with parentheses', () => {
  const _pasrt4 = _power_(assert, null, "assert((ten < 5) || (13 < ten))");
  const _parg4 = _pasrt4.recorder(0);
  _pasrt4.run(_parg4.rec(_parg4.tap(_parg4.tap(ten, 8, 8, 11) < _parg4.tap(5, 14, 14, 15), 12, 8, 15) || _parg4.tap(_parg4.tap(13, 21, 21, 23) < _parg4.tap(ten, 26, 26, 29), 24, 21, 29), 17, 7, 30));
});
it('two or more whitespaces', () => {
  const _pasrt5 = _power_(assert, null, "assert(2   <   ten    &&  ten     <  8)");
  const _parg5 = _pasrt5.recorder(0);
  _pasrt5.run(_parg5.rec(_parg5.tap(_parg5.tap(2, 7, 7, 8) < _parg5.tap(ten, 15, 15, 18), 11, 7, 18) && _parg5.tap(_parg5.tap(ten, 26, 26, 29) < _parg5.tap(8, 37, 37, 38), 34, 26, 38), 22, 7, 38));
});
