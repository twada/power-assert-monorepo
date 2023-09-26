import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { widthOf } from '../../dist/src/runtime/width.mjs';
import easta from 'easta';

describe('widthOf', () => {
  it('ascii', () => {
    assert.deepEqual(widthOf('abc'), { type: 'KnownWidth', width: 3 });
  });
  it('kanji', () => {
    assert.deepEqual(widthOf('真理'), { type: 'KnownWidth', width: 4 });
  });
  it('surrogate pairs', () => {
    assert.deepEqual(widthOf('𠮷野家で𩸽'), { type: 'KnownWidth', width: 10 });
  });
  it('zenkaku eisu (FULLWIDTH)', () => {
    assert.deepEqual(widthOf('ＡＢＣ'), { type: 'KnownWidth', width: 6 });
  });
  it('hankaku kan (HALFWIDTH)', () => {
    assert.deepEqual(widthOf('ｱｲｳｴｵ'), { type: 'KnownWidth', width: 5 });
  });
  it('ambiguous', () => {
    assert.deepEqual(widthOf('◎■'), { type: 'UnknownWidth', emoji: 0, ambiguous: 2, neutral: 0, hint: 4 });
  });
  it('U+A9C5', () => {
    assert.deepEqual(widthOf('꧅'), { type: 'UnknownWidth', emoji: 0, ambiguous: 0, neutral: 1, hint: 1 });
  });
  it('ascii with combining character', () => {
    assert.deepEqual(widthOf('a\u0300b'), { type: 'KnownWidth', width: 2 });
  });
  it('ascii with combining character with surrogate pair', () => {
    assert.deepEqual(widthOf('a\u0300𠮷b'), { type: 'KnownWidth', width: 4 });
  });
  describe('emoji characterization', () => {
    it('emoji sequence example', () => {
      assert.deepEqual(widthOf('👨‍👩‍👧‍👦'), { type: 'UnknownWidth', emoji: 1, ambiguous: 0, neutral: 0, hint: 2 });
    });
    it('the dark side of emoji 1', () => {
      assert.deepEqual(widthOf('👨👨‍👩👨‍👩‍👧'), { type: 'UnknownWidth', emoji: 3, ambiguous: 0, neutral: 0, hint: 6 });
    });
    it('the dark side of emoji 2', () => {
      assert.deepEqual(widthOf('👧‍👦👨‍👩‍👧‍👦'), { type: 'UnknownWidth', emoji: 2, ambiguous: 0, neutral: 0, hint: 4 });
    });
    it('the dark side of emoji 3', () => {
      assert.deepEqual(widthOf('‍👩‍👧‍👦👩‍👧‍👦‍👧‍👦'), { type: 'UnknownWidth', emoji: 2, ambiguous: 0, neutral: 1, hint: 5 });
    });
    it('the dark side of emoji 4', () => {
      assert.deepEqual(widthOf('‍👩‍👧‍👦‍👧‍👦👧‍👦'), { type: 'UnknownWidth', emoji: 1, ambiguous: 0, neutral: 1, hint: 5 });
    });
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
