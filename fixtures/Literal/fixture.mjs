import assert from 'node:assert/strict';

assert(false);

assert(0);

assert.equal(1, 0);

assert(false, 'message');

assert(false, messageStr);

assert.equal(foo, 'bar', 'msg');

// regular expression will not be instrumented
assert(/^not/.exec(str));

// multibyte string literal
assert(fuga !== 'ふが');
assert('ほげ' !== 'ふが');

// binary Literal
assert(0b111110111);

// octal Literal
assert(0o767);
