import {describe, it} from 'node:test';
import assert from 'node:assert';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('non-computed', () => {
    const _pasrt1 = _power_(assert, null, "assert(obj.prop)");
    const _parg1 = _pasrt1.recorder(0);
    const obj = {
      prop: false
    };
    _pasrt1.run(_parg1.rec(_parg1.tap(obj, 7, 7, 10).prop, 11, 7, 15));
  });
  it('computed', () => {
    const _pasrt2 = _power_(assert, null, "assert(obj[key])");
    const _parg2 = _pasrt2.recorder(0);
    const obj = {
      prop: false
    };
    const key = 'prop';
    _pasrt2.run(_parg2.rec(_parg2.tap(obj, 7, 7, 10)[_parg2.tap(key, 11, 11, 14)], 10, 7, 15));
  });
  it('more MemberExpression computed:true', () => {
    const _pasrt3 = _power_(assert, null, "assert(obj[[[keys[zero], foo][zero], bar][one]][one])");
    const _parg3 = _pasrt3.recorder(0);
    const keys = {
      0: 'f o o'
    };
    const foo = 'f o o';
    const bar = 'b a r';
    const zero = 0;
    const one = 1;
    const obj = {
      'b a r': [true, false]
    };
    _pasrt3.run(_parg3.rec(_parg3.tap(_parg3.tap(obj, 7, 7, 10)[_parg3.tap(_parg3.tap([_parg3.tap(_parg3.tap([_parg3.tap(_parg3.tap(keys, 13, 13, 17)[_parg3.tap(zero, 18, 18, 22)], 17, 13, 23), _parg3.tap(foo, 25, 25, 28)], 12, 12, 29)[_parg3.tap(zero, 30, 30, 34)], 29, 12, 35), _parg3.tap(bar, 37, 37, 40)], 11, 11, 41)[_parg3.tap(one, 42, 42, 45)], 41, 11, 46)], 10, 7, 47)[_parg3.tap(one, 48, 48, 51)], 47, 7, 52));
  });
});
