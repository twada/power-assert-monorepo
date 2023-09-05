import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { width, widthOf } from '../../dist/src/runtime/width.mjs';
import easta from 'easta';

describe('width', () => {
  it('ascii', () => {
    assert.deepEqual(width('abc'), { type: 'KnownWidth', width: 3 });
  });
  it('kanji', () => {
    assert.deepEqual(width('真理'), { type: 'KnownWidth', width: 4 });
  });
  it('surrogate pairs', () => {
    assert.deepEqual(width('𠮷野家で𩸽'), { type: 'KnownWidth', width: 10 });
  });
  it('zenkaku eisu (FULLWIDTH)', () => {
    assert.deepEqual(width('ＡＢＣ'), { type: 'KnownWidth', width: 6 });
  });
  it('hankaku kan (HALFWIDTH)', () => {
    assert.deepEqual(width('ｱｲｳｴｵ'), { type: 'KnownWidth', width: 5 });
  });
  it('ambiguous', () => {
    assert.deepEqual(width('◎■'), { type: 'KnownWidth', width: 4 });
  });
  it('U+A9C5', () => {
    assert.deepEqual(width('꧅'), { type: 'UnknownWidth', hint: 1 });
  });
  it('ascii with combining character', () => {
    assert.deepEqual(width('a\u0300b'), { type: 'KnownWidth', width: 2 });
  });
  it('emoji', () => {
    assert.deepEqual(width('👨‍👩‍👧‍👦'), { type: 'UnknownWidth', hint: 2 });
  });
});

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
