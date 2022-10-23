import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('description', () => {
  it('non-computed', () => {
    const obj = {
      prop: false
    };
    assert(obj.prop);
  });
  it('computed', () => {
    const obj = {
      prop: false
    };
    const key = 'prop';
    assert(obj[key]);
  });
});
