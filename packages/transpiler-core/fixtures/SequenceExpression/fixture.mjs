import assert from 'node:assert/strict';

assert((2, 1, 0));

assert((foo, bar) === baz);

assert(toto((tata, titi)));

assert((foo, (bar, baz)));

assert((((((foo, bar), baz), toto), tata), titi));

assert((y = x, z));
