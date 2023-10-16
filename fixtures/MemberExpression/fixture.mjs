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
  it('more MemberExpression computed:true', () => {
    const keys = {
      0: 'f o o'
    };
    const foo = 'f o o';
    const bar = 'b a r';
    const zero = 0;
    const one = 1;
    const obj = {
      'b a r': [true, false]
    };
    assert(obj[[[keys[zero], foo][zero], bar][one]][one]);
  });
});
