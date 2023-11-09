import { describe, it, assert as assume } from 'vitest';

describe('description', () => {
  it('example', () => {
    const truthy = '1';
    const falsy = 0;
    assume(truthy === falsy);
  });
  it('literal', () => {
    const truthy = '1';
    assume(truthy === 0);
  });
});
