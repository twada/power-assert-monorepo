import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('description', () => {
  it('example', () => {
    const truthy = '1';
    const falsy = 0;
    assert.is.not.ok(truthy === falsy);
  });
});
