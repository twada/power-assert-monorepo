import { _power_ } from '../../../src/runtime/runtime.mjs';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('example', () => {
        const _asrt1 = _power_(assert, null, 'assert(truthy === falsy)');
        const _arg1 = _asrt1.newArgumentRecorder(0);
        const truthy = '1';
        const falsy = 0;
        _asrt1.run(_arg1._rec(_arg1._tap(truthy, 'arguments/0/left', 7) === _arg1._tap(falsy, 'arguments/0/right', 18), 'arguments/0', 14));
    });
});
