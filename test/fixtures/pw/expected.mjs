import { _power_ } from '../../../runtime/runtime.mjs';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('example', () => {
        const _asrt1 = _power_(assert.ok, assert, 'assert.ok(truthy === falsy)');
        const _arg1 = _asrt1.newArgumentRecorder(0);
        const _asrt2 = _power_(assert.equal, assert, 'assert.equal(truthy, falsy)');
        const _arg2 = _asrt2.newArgumentRecorder(0);
        const _arg3 = _asrt2.newArgumentRecorder(1);
        const truthy = '1';
        const falsy = 0;
        _asrt1.run(_arg1._rec(_arg1._tap(truthy, 'arguments/0/left', 10) === _arg1._tap(falsy, 'arguments/0/right', 21), 'arguments/0', 17));
        _asrt2.run(_arg2._rec(truthy, 'arguments/0', 13), _arg3._rec(falsy, 'arguments/1', 21));
    });
});
