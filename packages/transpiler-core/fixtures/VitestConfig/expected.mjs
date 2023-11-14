import {describe, it, assert as assume} from 'vitest';
import {_power_} from "@power-assert/runtime";
describe('description', () => {
  it('example', () => {
    const _pasrt1 = _power_(assume, null, "assume(truthy === falsy)");
    const _parg1 = _pasrt1.recorder(0);
    const truthy = '1';
    const falsy = 0;
    _pasrt1.run(_parg1.rec(_parg1.tap(truthy, 7) === _parg1.tap(falsy, 18), 14));
  });
  it('literal', () => {
    const _pasrt2 = _power_(assume, null, "assume(truthy === 0)");
    const _parg2 = _pasrt2.recorder(0);
    const truthy = '1';
    _pasrt2.run(_parg2.rec(_parg2.tap(truthy, 7) === _parg2.tap(0, 18), 14));
  });
});
