import { ok, equal as eq } from 'node:assert';

const truthy = '1';
const falsy = 0;
ok(truthy);
eq(truthy, falsy);
