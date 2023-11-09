import assert from 'node:assert/strict';

assert(foo ? bar : baz);

assert(falsy ? truthy : truthy ? anotherFalsy : truthy);

assert(foo() ? bar.baz : (typeof goo));

assert.equal((foo ? bar : baz), (falsy ? truthy : truthy ? anotherFalsy : truthy));
