import { _power_ } from '../../../dist/runtime/runtime.mjs';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('function', () => {
        const _asrt1 = _power_(assert, null, 'assert(func())');
        const _arg1 = _asrt1.newArgumentRecorder(0);
        const func = () => false;
        _asrt1.run(_arg1._rec(func(), 'arguments/0', 7));
    });
    it('method', () => {
        const _asrt2 = _power_(assert, null, 'assert(obj.method())');
        const _arg2 = _asrt2.newArgumentRecorder(0);
        const obj = { method: () => false };
        _asrt2.run(_arg2._rec(_arg2._tap(obj, 'arguments/0/callee/object', 7).method(), 'arguments/0', 11));
    });
});
