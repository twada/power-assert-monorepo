import { _power_ } from '@power-assert/runtime';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('function', () => {
        const _pasrt1 = _power_(assert, null, 'assert(func())');
        const _parg1 = _pasrt1.recorder(0);
        const func = () => false;
        _pasrt1.run(_parg1.rec(func(), 'arguments/0', 7));
    });
    it('method', () => {
        const _pasrt2 = _power_(assert, null, 'assert(obj.method())');
        const _parg2 = _pasrt2.recorder(0);
        const obj = { method: () => false };
        _pasrt2.run(_parg2.rec(_parg2.tap(obj, 'arguments/0/callee/object', 7).method(), 'arguments/0', 11));
    });
});