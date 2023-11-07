import assert from 'node:assert';

const truthy = '1';
const falsy = 0;
assert.ok(truthy);
assert.equal(truthy, falsy);
