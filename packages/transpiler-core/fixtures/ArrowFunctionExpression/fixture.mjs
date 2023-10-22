import assert from 'node:assert/strict';

// function body will not be instrumented
assert(v => v + 1);

assert((v, i) => v + i);

assert(v => ({even: v, odd: v + 1}));

assert(seven === ((v, i) => v + i)(four, five));

test('test name', () => assert(user.name === 'Bob'));

test('promise', () => {
    return Promise.resolve().then(() => assert(true === false));
});
