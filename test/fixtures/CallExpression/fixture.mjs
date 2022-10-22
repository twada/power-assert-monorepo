import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('description', () => {
  it('function', () => {
    const func = () => true;
    assert(func());
  });
  it('method', () => {
    const obj = {
      method: () => true
    };
    assert(obj.method());
  });
});
