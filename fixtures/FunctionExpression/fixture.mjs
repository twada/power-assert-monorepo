import assert from 'node:assert/strict';

// body will not be instrumented
assert(function (a, b) { return a + b; });

assert(baz === (function (a, b) { return a + b; })(foo, bar));
