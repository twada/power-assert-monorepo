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
    assert.deepEqual(widthOf('◎■'), { type: 'KnownWidth', width: 4 });
  });
  it('U+A9C5', () => {
    assert.deepEqual(widthOf('꧅'), { type: 'UnknownWidth', hint: 1 });
  });
  it('ascii with combining character', () => {
    assert.deepEqual(widthOf('a\u0300b'), { type: 'KnownWidth', width: 2 });
  });
  it('ascii with combining character with surrogate pair', () => {
    assert.deepEqual(widthOf('a\u0300𠮷b'), { type: 'KnownWidth', width: 4 });
  });
  it('emoji', () => {
    assert.deepEqual(widthOf('👨‍👩‍👧‍👦'), { type: 'UnknownWidth', hint: 2 });
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
