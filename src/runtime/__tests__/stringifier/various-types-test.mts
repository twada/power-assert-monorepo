import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { stringify } from '../../stringifier/stringifier.mjs';
import { typeName } from '../../stringifier/type-name.mjs';

// type Person = {
//   readonly name: string;
//   age: number;
// };

// function Person (this: Person, name: string, age: number) {
//   Object.defineProperty(this, 'name', { value: name, writable: false });
//   this.age = age;
// }

class Person {
  readonly name: string;
  readonly age: number;
  constructor (name: string, age: number) {
    this.name = name;
    this.age = age;
  }
}

const AnonPerson = class {
  readonly name: string;
  readonly age: number;
  constructor (name: string, age: number) {
    this.name = name;
    this.age = age;
  }
};
// const AnonPerson = function (name: string, age: number) {
//   this.name = name;
//   this.age = age;
// };
const anonymous = new AnonPerson('bob', 4);

const fixtures = {
  'string primitive': {
    input: 'foo',
    expected: '"foo"',
    pruned: '"foo"'
  },
  'number primitive': {
    input: 5,
    expected: '5',
    pruned: '5'
  },
  'bigint primitive': {
    input: BigInt('-100000000000000005'),
    expected: '-100000000000000005n',
    pruned: '-100000000000000005n'
  },
  'boolean primitive': {
    input: false,
    expected: 'false',
    pruned: 'false'
  },
  'symbol primitive': {
    input: Symbol('FOO'),
    expected: 'Symbol(FOO)',
    pruned: 'Symbol(FOO)'
  },
  'undefined primitive': {
    input: undefined,
    expected: 'undefined',
    pruned: 'undefined'
  },
  'null literal': {
    input: null,
    expected: 'null',
    pruned: 'null'
  },
  'regexp literal': {
    input: /^not/,
    expected: '/^not/',
    pruned: '/^not/'
  },
  'array literal': {
    input: ['foo', 4],
    expected: '["foo",4]',
    pruned: '#Array#'
  },
  'object literal': {
    input: { name: 'bar' },
    expected: 'Object{name:"bar"}',
    pruned: '#Object#'
  },
  'function expression': {
    input: function () {
      // do nothing
    },
    expected: '#function#',
    pruned: '#function#'
  },
  'String object': {
    input: new String('bar'), // eslint-disable-line no-new-wrappers
    expected: 'new String("bar")',
    pruned: 'new String("bar")'
  },
  'Number object': {
    input: new Number('3'), // eslint-disable-line no-new-wrappers
    expected: 'new Number(3)',
    pruned: 'new Number(3)'
  },
  'Boolean object': {
    input: new Boolean('1'), // eslint-disable-line no-new-wrappers
    expected: 'new Boolean(true)',
    pruned: 'new Boolean(true)'
  },
  'Date object': {
    input: new Date('1970-01-01'),
    expected: 'new Date("1970-01-01T00:00:00.000Z")',
    pruned: 'new Date("1970-01-01T00:00:00.000Z")'
  },
  'RegExp object': {
    input: new RegExp('^not', 'g'), // eslint-disable-line prefer-regex-literals
    expected: '/^not/g',
    pruned: '/^not/g'
  },
  'Array object': {
    /* eslint-disable @typescript-eslint/no-array-constructor */
    /* eslint-disable no-array-constructor */
    input: new Array(),
    /* eslint-enable no-array-constructor */
    /* eslint-enable @typescript-eslint/no-array-constructor */
    expected: '[]',
    pruned: '#Array#'
  },
  'Object object': {
    input: new Object(), // eslint-disable-line no-new-object
    expected: 'Object{}',
    pruned: '#Object#'
  },
  'Function object': {
    input: new Function('x', 'y', 'return x + y'), // eslint-disable-line no-new-func
    expected: '#function#',
    pruned: '#function#'
  },
  'arguments object': {
    input: (function () { return arguments; })(), // eslint-disable-line prefer-rest-params
    expected: 'Arguments{}',
    pruned: '#Arguments#'
  },
  'Error object': {
    input: new Error('error!'),
    expected: 'Error{message:"error!"}',
    pruned: '#Error#'
  },
  'TypeError object': {
    input: new TypeError('type error!'),
    expected: 'TypeError{message:"type error!"}',
    pruned: '#TypeError#'
  },
  'RangeError object': {
    input: new RangeError('range error!'),
    expected: 'RangeError{message:"range error!"}',
    pruned: '#RangeError#'
  },
  'Promise object': {
    input: Promise.resolve(1),
    expected: 'Promise{}',
    pruned: '#Promise#'
  },
  'user-defined constructor': {
    input: new Person('alice', 5),
    expected: 'Person{name:"alice",age:5}',
    pruned: '#Person#'
  },
  'NaN': { // eslint-disable-line quote-props
    input: NaN,
    expected: 'NaN',
    pruned: 'NaN'
  },
  'Infinity': { // eslint-disable-line quote-props
    input: Infinity,
    expected: 'Infinity',
    pruned: 'Infinity'
  },
  '-Infinity': {
    input: -Infinity,
    expected: '-Infinity',
    pruned: '-Infinity'
  },
  'Math': { // eslint-disable-line quote-props
    input: Math,
    expected: 'Math{}',
    pruned: '#Math#'
  },
  'JSON': { // eslint-disable-line quote-props
    input: JSON,
    expected: 'JSON{}',
    pruned: '#JSON#'
  },
  'anonymous constructor': {
    input: anonymous,
    expected: '@Anonymous{name:"bob",age:4}',
    pruned: '#@Anonymous#'
  }
};

if (typeName(anonymous) === 'AnonPerson') {
  fixtures['anonymous constructor'] = {
    input: anonymous,
    expected: 'AnonPerson{name:"bob",age:4}',
    pruned: '#AnonPerson#'
  };
// } else {
//   fixtures['anonymous constructor'] = {
//     input: anonymous,
//     expected: '@Anonymous{name:"bob",age:4}',
//     pruned: '#@Anonymous#'
//   };
}

describe('stringify and type-name', () => {
  for (const [fixtureName, { input, expected, pruned }] of Object.entries(fixtures)) {
    describe(fixtureName, () => {
      it('single ' + fixtureName, () => {
        assert.equal(stringify(input), expected);
      });
      it('Array containing ' + fixtureName, () => {
        const ary: unknown[] = [];
        ary.push(input);
        assert.equal(stringify(ary), '[' + expected + ']');
      });
      it('Object containing ' + fixtureName, () => {
        const obj = { val: input };
        // obj.val = input;
        assert.equal(stringify(obj), 'Object{val:' + expected + '}');
      });
      it('with maxDepth = 1: single ' + fixtureName, () => {
        assert.equal(stringify(input, { maxDepth: 1 }), expected);
      });
      it('with maxDepth = 1: Array containing ' + fixtureName, () => {
        const ary: unknown[] = [];
        ary.push(input);
        assert.equal(stringify(ary, { maxDepth: 1 }), '[' + pruned + ']');
      });
      it('with maxDepth = 1: Object containing ' + fixtureName, () => {
        const obj = { val: input };
        // obj.val = input;
        assert.equal(stringify(obj, { maxDepth: 1 }), 'Object{val:' + pruned + '}');
      });
      it('non-regular prop name ' + fixtureName, () => {
        const obj = { '^pr"op-na:me': input };
        // obj['^pr"op-na:me'] = input;
        assert.equal(stringify(obj, { maxDepth: 1 }), 'Object{"^pr\\"op-na:me":' + pruned + '}');
      });
    });
  }
});
