import {_power_} from "@power-assert/runtime";
import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
  it('example', () => {
    const _pasrt1 = _power_(assert, null, "assert(truthy === falsy)", {
      binexp: "==="
    });
    const _parg1 = _pasrt1.recorder(0);
    const truthy = '1';
    const falsy = 0;
    _pasrt1.run(_parg1.rec(_parg1.tap(truthy, "arguments/0/left", 7) === _parg1.tap(falsy, "arguments/0/right", 18), "arguments/0", 14));
  });
  it('literal', () => {
    const _pasrt2 = _power_(assert, null, "assert(truthy === 0)", {
      binexp: "==="
    });
    const _parg2 = _pasrt2.recorder(0);
    const truthy = '1';
    _pasrt2.run(_parg2.rec(_parg2.tap(truthy, "arguments/0/left", 7) === _parg2.tap(0, "arguments/0/right", 18), "arguments/0", 14));
  });
});
