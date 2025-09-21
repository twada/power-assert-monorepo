import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';

export function add (augend: number, addened: number): number {
  return augend + addened;
}

describe('Node Strip-Types demo', () => {
  test('acceptance criteria', () => {
    const augend: number = 3;
    const addend: number = 4;
    assert(add(augend, addend) === 5);
  });
});
