import { _power_ } from './runtime.mjs';
import {
  describe,
  it
} from 'node:test';
import assert from 'assert';
describe('description', () => {
  it('example', () => {
    const _asrt1 = _power_(assert.is.not.ok, assert.is.not, 'assert.is.not.ok(truthy === falsy)');
    const _arg1 = _asrt1.newArgumentRecorder();
    const truthy = '1';
    const falsy = 0;
    _asrt1.run(_arg1._rec(_arg1._tap(truthy, 'arguments/0/left', 17) === _arg1._tap(falsy, 'arguments/0/right', 28), 'arguments/0', 24));
  });
});
