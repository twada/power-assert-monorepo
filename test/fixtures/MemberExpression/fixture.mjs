import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('description', () => {
  it('non-computed', () => {
    const obj = {
      prop: true
    };
    assert(obj.prop);
  });
  it('computed', () => {
    const obj = {
      prop: true
    };
    const key = 'prop';
    assert(obj[key]);
  });
});
