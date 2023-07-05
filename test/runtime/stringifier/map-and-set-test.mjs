import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { stringify } from '../../../dist/src/runtime/stringifier/stringifier.mjs';

describe('stringify Map', () => {
  it('empty Map', () => {
    const map = new Map();
    assert.equal(stringify(map), 'Map(0){}');
  });

  it('flat Map', () => {
    const map = new Map();
    map.set('a', 'A');
    map.set('b', 'B');
    assert.equal(stringify(map), 'Map(2){"a"=>"A","b"=>"B"}');
  });

  it('nested Map', () => {
    const map = new Map();
    map.set('a', 'A');
    const m2 = new Map();
    m2.set('ba', 'BA');
    m2.set('bb', 'BB');
    map.set('b', m2);
    map.set('c', 4);
    assert.equal(stringify(map), 'Map(3){"a"=>"A","b"=>Map(2){"ba"=>"BA","bb"=>"BB"},"c"=>4}');
  });

  it('circular detection', async () => {
    const root = new Map();
    root.set('a', 'A');
    const m2 = new Map();
    root.set('m2', m2);
    m2.set('root', root);
    m2.set('bb', 'BB');
    root.set('c', 0);
    assert.equal(stringify(root), 'Map(3){"a"=>"A","m2"=>Map(2){"root"=>#@Circular#,"bb"=>"BB"},"c"=>0}');
  });

  describe('various key type', () => {
    it('special number key', () => {
      const map = new Map();
      map.set(NaN, 'not a number');
      map.set(Infinity, 'positive infinity');
      map.set(-Infinity, 'negative infinity');
      assert.equal(stringify(map), 'Map(3){NaN=>"not a number",Infinity=>"positive infinity",-Infinity=>"negative infinity"}');
    });

    it('object key', () => {
      const map = new Map();
      map.set({}, 'empty object');
      map.set({ name: 'robert', nickname: 'bob' }, 10);
      assert.equal(stringify(map), 'Map(2){Object{}=>"empty object",Object{name:"robert",nickname:"bob"}=>10}');
    });

    it('array key', () => {
      const map = new Map();
      map.set([], 'empty array');
      map.set(['alice', 10], 'alice');
      map.set(['bob', 15], 'bob');
      assert.equal(stringify(map), 'Map(3){[]=>"empty array",["alice",10]=>"alice",["bob",15]=>"bob"}');
    });

    it('circular detection between keys and values', async () => {
      const m1 = new Map();
      const m2 = new Map();
      m1.set(m2, 1);
      m2.set(m1, 2);
      assert.equal(stringify(m1), 'Map(1){Map(1){#@Circular#=>2}=>1}');
    });
  });
});

describe('stringify Set', () => {
  it('empty Set', () => {
    const set = new Set();
    assert.equal(stringify(set), 'Set(0){}');
  });

  it('flat Set', () => {
    const set = new Set();
    set.add('a');
    set.add('b');
    assert.equal(stringify(set), 'Set(2){"a","b"}');
  });

  it('nested Set', () => {
    const set = new Set();
    set.add('a');
    const s2 = new Set();
    s2.add('ba');
    s2.add('bb');
    set.add(s2);
    set.add(8);
    assert.equal(stringify(set), 'Set(3){"a",Set(2){"ba","bb"},8}');
  });
});
