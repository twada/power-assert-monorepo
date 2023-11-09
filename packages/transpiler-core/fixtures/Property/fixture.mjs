import assert from 'node:assert/strict';

// Computed (dynamic) property names
assert({[num]: foo});

assert({[ 'prop_' + (() => bar())() ]: 42});

assert({[`prop_${generate(seed)}`]: foo});

// shorthand literal itself will not be instrumented
assert({foo});

assert({foo, bar: baz});
