import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('non-computed', () => {
    const _pasrt1 = _power_(assert, null, "assert(obj.prop)");
    const _parg1 = _pasrt1.recorder(0);
    const obj = {
      prop: false
    };
    _pasrt1.run(_parg1.rec(_parg1.tap(obj, "arguments/0/object", 7).prop, "arguments/0", 11));
  });
  it('computed', () => {
    const _pasrt2 = _power_(assert, null, "assert(obj[key])");
    const _parg2 = _pasrt2.recorder(0);
    const obj = {
      prop: false
    };
    const key = 'prop';
    _pasrt2.run(_parg2.rec(_parg2.tap(obj, "arguments/0/object", 7)[_parg2.tap(key, "arguments/0/property", 11)], "arguments/0", 10));
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
    _pasrt3.run(_parg3.rec(_parg3.tap(_parg3.tap(obj, "arguments/0/object/object", 7)[_parg3.tap(_parg3.tap([_parg3.tap(_parg3.tap([_parg3.tap(_parg3.tap(keys, "arguments/0/object/property/object/elements/0/object/elements/0/object", 13)[_parg3.tap(zero, "arguments/0/object/property/object/elements/0/object/elements/0/property", 18)], "arguments/0/object/property/object/elements/0/object/elements/0", 17), _parg3.tap(foo, "arguments/0/object/property/object/elements/0/object/elements/1", 25)], "arguments/0/object/property/object/elements/0/object", 12)[_parg3.tap(zero, "arguments/0/object/property/object/elements/0/property", 30)], "arguments/0/object/property/object/elements/0", 29), _parg3.tap(bar, "arguments/0/object/property/object/elements/1", 37)], "arguments/0/object/property/object", 11)[_parg3.tap(one, "arguments/0/object/property/property", 42)], "arguments/0/object/property", 41)], "arguments/0/object", 10)[_parg3.tap(one, "arguments/0/property", 48)], "arguments/0", 47));
  });
});
