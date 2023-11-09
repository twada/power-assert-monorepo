import assert from 'node:assert/strict';

// class body will not be instrumented
assert(class Me { getClassName() { return foo + Me.name; } });
