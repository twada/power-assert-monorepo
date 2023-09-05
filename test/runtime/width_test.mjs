import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { widthOf } from '../../dist/src/runtime/width.mjs';
import easta from 'easta';

describe('learning easta', () => {
  it('narrow', () => {
    assert.equal(easta('a'), 'Na');
  });
  it('wide', () => {
    assert.equal(easta('𠮷'), 'W');
  });
  it('zenkaku eisu (FULLWIDTH)', () => {
    assert.equal(easta('Ａ'), 'F');
  });
  it('hankaku kan (HALFWIDTH)', () => {
    assert.equal(easta('ｱ'), 'H');
  });
  it('ambiguous', () => {
    assert.equal(easta('◎'), 'A');
  });
  it('U+A9C5', () => {
    assert.equal(easta('꧅'), 'N');
  });
  it('ascii with combining character', () => {
    assert.equal(easta('a\u0300'), 'Na');
  });
  it('emoji', () => {
    assert.equal(easta('👨‍👩‍👧‍👦'), 'W');
  });
});

describe('widthOf string', () => {
  it('ascii', () => {
    assert.equal(widthOf('abc'), 3);
  });
  it('kanji', () => {
    assert.equal(widthOf('真理'), 4);
  });
  it('surrogate pairs', () => {
    assert.equal(widthOf('𠮷野家で𩸽'), 10);
  });
  it('ascii with surrogate pair', () => {
    assert.equal(widthOf('a𠮷b'), 4);
  });
  it('ascii with combining character', () => {
    assert.equal(widthOf('a\u0300b'), 2);
  });
  it('ascii with combining character and surrogate pair', () => {
    assert.equal(widthOf('a\u0300𠮷b'), 4);
  });
  it('emoji', () => {
    assert.equal(widthOf('👨‍👩‍👧‍👦'), 2);
  });
});
