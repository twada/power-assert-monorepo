import test from 'node:test';
import { strict as assert } from 'node:assert';
import { stringify } from '../../src/runtime/stringifier/index.mjs';

test('Array', async (t) => {
  await t.test('flat', () => {
    const input = [4, 5, 6];
    assert.equal(stringify(input), '[4,5,6]');
  });
  await t.test('nested', (t) => {
    const input = [4, [5, [6, 7, 8], 9], 10];
    assert.equal(stringify(input), '[4,[5,[6,7,8],9],10]');
  });
  await t.test('sparse arrays', async (t) => {
    await t.test('empty', () => {
      const input = Array(3);
      assert.equal(stringify(input), '[,,]');
    });
    await t.test('values', () => {
      const input = [];
      input[2] = 'foo';
      input[5] = 'bar';
      assert.equal(stringify(input), '[,,"foo",,,"bar"]');
    });
    await t.test('nested', () => {
      const input = [];
      input[1] = 'foo';
      input[3] = Array(4);
      input[5] = 'bar';
      assert.equal(stringify(input), '[,"foo",,[,,,],,"bar"]');
    });
  });
});


test('Array indentation', async (t) => {
  await t.test('empty array', () => {
    const input = [];
    assert.equal(stringify(input, { indent: '  ' }), '[]');
  });
  await t.test('3 items array', () => {
    const input = [3, 5, 8];

    const expected = [
      '[',
      '  3,',
      '  5,',
      '  8',
      ']'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested array', () => {
    const input = [4, [5, [6, 7, 8], 9], 10];

    const expected = [
      '[',
      '  4,',
      '  [',
      '    5,',
      '    [',
      '      6,',
      '      7,',
      '      8',
      '    ],',
      '    9',
      '  ],',
      '  10',
      ']'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested empty array', () => {
    const input = [3, [], 8];

    const expected = [
      '[',
      '  3,',
      '  [],',
      '  8',
      ']'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested array with maxDepth option', () => {
    const input = [3, [4, 5], 8];

    const expected = [
      '[',
      '  3,',
      '  #Array#,',
      '  8',
      ']'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ', maxDepth: 1 }), expected);
  });
});


test('Object indentation', async (t) => {
  await t.test('empty object', () => {
    const input = {};
    assert.equal(stringify(input, { indent: '  ' }), 'Object{}');
  });
  await t.test('two props object', () => {
    const input = { name: 'bob', age: 3 };

    const expected = [
      'Object{',
      '  name: "bob",',
      '  age: 3',
      '}'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested object', () => {
    const input = { a: 'A', b: { ba: 'BA', bb: 'BB' }, c: 4 };

    const expected = [
      'Object{',
      '  a: "A",',
      '  b: Object{',
      '    ba: "BA",',
      '    bb: "BB"',
      '  },',
      '  c: 4',
      '}'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested empty object', () => {
    const input = { a: 'A', b: {}, c: 4 };

    const expected = [
      'Object{',
      '  a: "A",',
      '  b: Object{},',
      '  c: 4',
      '}'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ' }), expected);
  });
  await t.test('nested object with maxDepth option', () => {
    const input = { a: 'A', b: { ba: 'BA', bb: 'BB' }, c: 4 };

    const expected = [
      'Object{',
      '  a: "A",',
      '  b: #Object#,',
      '  c: 4',
      '}'
    ].join('\n');
    assert.equal(stringify(input, { indent: '  ', maxDepth: 1 }), expected);
  });
});


test('circular references', async (t) => {
  await t.test('circular object', () => {
    const circularObj = {};
    circularObj.circularRef = circularObj;
    circularObj.list = [ circularObj, circularObj ];
    const expected = [
      'Object{',
      '  circularRef: #@Circular#,',
      '  list: [',
      '    #@Circular#,',
      '    #@Circular#',
      '  ]',
      '}'
    ].join('\n');
    assert.equal(stringify(circularObj, { indent: '  ' }), expected);
  });
  await t.test('circular array', () => {
    const circularArray = [3, 5];
    circularArray.push(circularArray);
    const expected = [
      '[',
      '  3,',
      '  5,',
      '  #@Circular#',
      ']'
    ].join('\n');
    assert.equal(stringify(circularArray, { indent: '  ' }), expected);
  });
});
