import assert from 'node:assert/strict';

assert(counter += 1);

assert(dog.age += 1);

assert(dog.age    +=  1);

assert.strictEqual(dog.age += 1, three);

// left hand side of Destructuring will not be instrumented
assert([x] = [3]);

assert([x] = [foo]);
