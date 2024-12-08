import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('power-assert demo', () => {
  it('Array#indexOf', () => {
    const ary = [0, 1, 2];
    const zero = 0;
    const two = 2;
    assert(ary.indexOf(zero) === two);
  });

  it('Destructuring and TemplateLiteral', () => {
    const [alice, bob] = [{ name: 'alice' }, { name: 'bob' }];
    assert(`${alice.name} and ${bob.name}` === 'bob and alice');
  });
});
