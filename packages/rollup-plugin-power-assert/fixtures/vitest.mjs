import { describe, it, assert } from 'vitest';

describe('description', () => {
  it('example', () => {
    const truthy = '1';
    const falsy = 0;
    assert.ok(truthy);
    assert.equal(truthy, falsy);
  });
});
