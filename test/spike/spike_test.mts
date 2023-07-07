import { test } from 'node:test';
import { strict as assert } from 'node:assert';


test('spike', () => {
  const falsy: number = 0;
  const truthy: number = falsy + 1;
  assert(falsy === truthy);
});
