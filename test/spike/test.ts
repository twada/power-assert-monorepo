import { test } from 'node:test';
import { ok as assume } from 'node:assert/strict';


test('spike', () => {
  const falsy: string = '偽';
  // const truthy: number = falsy + 1;
  assume('真理' === falsy);
});
