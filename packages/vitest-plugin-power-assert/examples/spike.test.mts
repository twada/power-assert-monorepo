import { test, assert } from 'vitest';

test('spike', () => {
  const falsy: number = 0;
  const truthy: number = falsy + 1;
  assert(falsy === truthy);
});
