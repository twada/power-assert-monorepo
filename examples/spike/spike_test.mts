import { test } from 'node:test';
import { ok as assume } from 'node:assert/strict';


test('spike', () => {
  const falsy: number = 0;
  const truthy: number = falsy + 1;
  assume(falsy === truthy);
});
