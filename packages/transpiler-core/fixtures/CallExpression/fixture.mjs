import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('description', () => {
  it('function', () => {
    const func = () => false;
    assert(func());
  });
  it('method', () => {
    const obj = {
      method: () => false
    };
    assert(obj.method());
  });
  it('computed method', () => {
    const methodName = 'method';
    const obj = {
      method: () => false
    };
    assert(obj[methodName]());
  });
});
