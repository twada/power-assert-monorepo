import {
    describe,
    it
} from 'node:test';
import assert from 'node:assert';
import { ArgumentRecorder, _pwmeta, power } from './runtime.mjs';

describe('description', () => {
    it('example', () => {
        const _am1 = _pwmeta('assert(truthy === falsy)');
        const _arg1 = new ArgumentRecorder(assert, _am1);
        const truthy = '1';
        const falsy = 0;
        const func = power(assert, null, _am1);
        func(_arg1._rec(_arg1._tap(truthy, 'arguments/0/left', 7) === _arg1._tap(falsy, 'arguments/0/right', 18), 'arguments/0', 14));
    });
});
