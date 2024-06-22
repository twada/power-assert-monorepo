import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('description', () => {
  it('function', () => {
    const func = () => false;
    assert(func());
  });

  it('method callee is non-computed MemberExpression', () => {
    const obj = {
      method: () => false
    };
    assert(obj.method());
  });

  it('method callee is computed MemberExpression', () => {
    const methodName = 'method';
    const obj = {
      method: () => false
    };
    assert(obj[methodName]());
  });

  it('method callee is function', () => {
    const inner = () => ({
      exact () { return false; }
    });
    assert(inner().exact());
  });

  it('CallExpression of CallExpression of CallExpression', () => {
    const outer = () => () => () => false;
    assert(outer()()());
  });

  it('method callee is non-computed MemberExpression that returns function then invoke immediately', () => {
    const obj = {
      method () { return () => () => false; }
    };
    assert(obj.method()()());
  });


});
