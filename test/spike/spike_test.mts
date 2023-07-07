import { test } from 'node:test';
import { strict as assert } from 'node:assert';


test('spike', () => {
  const falsy = 0;
  const truthy = falsy + 1;
  assert(falsy === truthy);
});
