import assert from 'node:assert/strict';

assert([foo, bar]);

assert(typeof [[foo.bar, baz(moo)], + fourStr] === 'number');

assert.notDeepEqual([foo, bar], [hoge, fuga, piyo]);
