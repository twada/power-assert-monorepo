import {describe, it} from 'node:test';
import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('function', () => {
    const _pasrt1 = _power_(assert, null, "assert(func())");
    const _parg1 = _pasrt1.recorder(0);
    const func = () => false;
    _pasrt1.run(_parg1.rec(func(), 11));
  });
  it('method', () => {
    const _pasrt2 = _power_(assert, null, "assert(obj.method())");
    const _parg2 = _pasrt2.recorder(0);
    const obj = {
      method: () => false
    };
    _pasrt2.run(_parg2.rec(_parg2.tap(obj, 7).method(), 17));
  });
  it('computed method', () => {
    const _pasrt3 = _power_(assert, null, "assert(obj[methodName]())");
    const _parg3 = _pasrt3.recorder(0);
    const methodName = 'method';
    const obj = {
      method: () => false
    };
    _pasrt3.run(_parg3.rec(_parg3.tap(obj, 7)[_parg3.tap(methodName, 11)](), 22));
  });
});
