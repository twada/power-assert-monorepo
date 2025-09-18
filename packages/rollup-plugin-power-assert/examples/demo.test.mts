import { describe, it, assert } from 'vitest';

describe('power-assert demo', () => {
  it('Array#indexOf', () => {
    const ary = [0,1,2];
    const zero = 0;
    const two = 2;
    assert(ary.indexOf(zero) === two);
  });

  it('Destructuring and TemplateLiteral', () => {
    let [alice, bob] = [ { name: 'alice' }, { name: 'bob' } ];
    assert(`${alice.name} and ${bob.name}` === `bob and alice`);
  });
});
