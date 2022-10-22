import { _power_ } from '../../../runtime/runtime.mjs';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('non-computed', () => {
        const _asrt1 = _power_(assert, null, 'assert(obj.prop)');
        const _arg1 = _asrt1.newArgumentRecorder(0);
        const obj = { prop: true };
        _asrt1.run(_arg1._rec(_arg1._tap(obj, 'arguments/0/object', 7).prop, 'arguments/0', 11));
    });
    it('computed', () => {
        const _asrt2 = _power_(assert, null, 'assert(obj[key])');
        const _arg2 = _asrt2.newArgumentRecorder(0);
        const obj = { prop: true };
        const key = 'prop';
        _asrt2.run(_arg2._rec(_arg2._tap(obj, 'arguments/0/object', 7)[_arg2._tap(key, 'arguments/0/property', 11)], 'arguments/0', 10));
    });
});
