import {describe, it} from 'node:test';
import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('function', () => {
    const _pasrt1 = _power_(assert, null, "assert(func())");
    const _parg1 = _pasrt1.recorder(0);
    const func = () => false;
    _pasrt1.run(_parg1.rec(func(), 7, 7, 13, 0));
  });
  it('method callee is non-computed MemberExpression', () => {
    const _pasrt2 = _power_(assert, null, "assert(obj.method())");
    const _parg2 = _pasrt2.recorder(0);
    const obj = {
      method: () => false
    };
    _pasrt2.run(_parg2.rec(_parg2.tap(obj, 7, 7, 10, 1).method(), 11, 7, 19, 0));
  });
  it('method callee is computed MemberExpression', () => {
    const _pasrt3 = _power_(assert, null, "assert(obj[methodName]())");
    const _parg3 = _pasrt3.recorder(0);
    const methodName = 'method';
    const obj = {
      method: () => false
    };
    _pasrt3.run(_parg3.rec(_parg3.tap(obj, 7, 7, 10, 1)[_parg3.tap(methodName, 11, 11, 21, 2)](), 22, 7, 24, 0));
  });
  it('method callee is function', () => {
    const _pasrt4 = _power_(assert, null, "assert(inner().exact())");
    const _parg4 = _pasrt4.recorder(0);
    const inner = () => ({
      exact() {
        return false;
      }
    });
    _pasrt4.run(_parg4.rec(_parg4.tap(inner(), 7, 7, 14, 1).exact(), 15, 7, 22, 0));
  });
  it('CallExpression of CallExpression of CallExpression', () => {
    const _pasrt5 = _power_(assert, null, "assert(outer()()())");
    const _parg5 = _pasrt5.recorder(0);
    const outer = () => () => () => false;
    _pasrt5.run(_parg5.rec(_parg5.tap(_parg5.tap(outer(), 7, 7, 14, 2)(), 14, 7, 16, 1)(), 16, 7, 18, 0));
  });
  it('method callee is non-computed MemberExpression that returns function then invoke immediately', () => {
    const _pasrt6 = _power_(assert, null, "assert(obj.method()()())");
    const _parg6 = _pasrt6.recorder(0);
    const obj = {
      method() {
        return () => () => false;
      }
    };
    _pasrt6.run(_parg6.rec(_parg6.tap(_parg6.tap(_parg6.tap(obj, 7, 7, 10, 3).method(), 11, 7, 19, 2)(), 19, 7, 21, 1)(), 21, 7, 23, 0));
  });
});
