import * as assume from 'node:assert';

const truthy = '1';
const falsy = 0;
assume.ok(truthy);
assume.equal(truthy, falsy);
