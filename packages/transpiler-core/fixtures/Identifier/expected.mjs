import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('example', () => {
    const _pasrt1 = _power_(assert.ok, assert, "assert.ok(truthy)");
    const _parg1 = _pasrt1.recorder(0);
    const _pasrt2 = _power_(assert.equal, assert, "assert.equal(truthy, falsy)");
    const _parg2 = _pasrt2.recorder(0);
    const _parg3 = _pasrt2.recorder(1);
    const truthy = '1';
    const falsy = 0;
    _pasrt1.run(_parg1.rec(truthy, 10));
    _pasrt2.run(_parg2.rec(truthy, 13), _parg3.rec(falsy, 21));
  });
});
