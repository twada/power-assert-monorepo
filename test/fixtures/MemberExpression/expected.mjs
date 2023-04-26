import { _power_ } from '../../../dist/runtime/runtime.mjs';
import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert/strict';
describe('description', () => {
    it('non-computed', () => {
        const _pasrt1 = _power_(assert, null, 'assert(obj.prop)');
        const _parg1 = _pasrt1.recorder(0);
        const obj = { prop: false };
        _pasrt1.run(_parg1.rec(_parg1.tap(obj, 'arguments/0/object', 7).prop, 'arguments/0', 11));
    });
    it('computed', () => {
        const _pasrt2 = _power_(assert, null, 'assert(obj[key])');
        const _parg2 = _pasrt2.recorder(0);
        const obj = { prop: false };
        const key = 'prop';
        _pasrt2.run(_parg2.rec(_parg2.tap(obj, 'arguments/0/object', 7)[_parg2.tap(key, 'arguments/0/property', 11)], 'arguments/0', 10));
    });
});
