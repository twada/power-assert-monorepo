/* eslint @typescript-eslint/no-explicit-any: 0 */
import { typeName } from './type-name.mjs';
import type { State } from './traverse.mjs';
import { strict as assert } from 'node:assert';

const END = Symbol('end');
const ITERATE = Symbol('iterate');
type Direction = typeof END | typeof ITERATE;

export type StringifyConfig = {
  maxDepth: number | null,
  indent: string | null,
  anonymous: string,
  circular: string,
  snip: string,
  lineSeparator: string,
};

type KeyValueStore = { [key: string | number]: any };
type KeyValuePair = { key: string | number, value: any };

export type CollectorFunc = (str: string) => void;

export type MapKeyStringifier = (val: any, childState: State) => string;
export type MapKeyStringifierFactory = () => MapKeyStringifier;
export type Accumulator = {
  push: CollectorFunc,
  context: State,
  options: StringifyConfig & KeyValueStore,
  createMapKeyStringifier: MapKeyStringifierFactory
};
type Guard = (kvp: KeyValuePair, acc: Accumulator) => boolean;

export type Component = (acc: Accumulator, x: any) => Direction;
type Composable = (next: Component) => Component;

// chain of components should end with end() or iterate()
function compose (...components: Composable[]): Component {
  return components.reduceRight((right: Component, left: Composable) => left(right), terminator);
}

const terminator: Component = (_acc: Accumulator, _x: any) => {
  assert(false, 'chain of components should end with end() or iterate()');
};

// skip children
function end (): Composable {
  return (_next: Component) => {
    return (acc: Accumulator, _x: any) => {
      acc.context.skip();
      return END;
    };
  };
}

// iterate children
function iterate (): Composable {
  return (_next: Component) => {
    return (_acc: Accumulator, _x: any) => ITERATE;
  };
}

function allowedKeys (orderedAllowList?: string[]): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      if (!Array.isArray(x) && Array.isArray(orderedAllowList)) {
        acc.context.keys = orderedAllowList.filter((propKey) => Object.prototype.hasOwnProperty.call(x, propKey));
      }
      return next(acc, x);
    };
  };
}

function when (guard: Guard, then: Component): Composable {
  return (next) => {
    return (acc: Accumulator, x: any) => {
      const kvp = {
        key: acc.context.key,
        value: x
      };
      if (guard(kvp, acc)) {
        return then(acc, x);
      }
      return next(acc, x);
    };
  };
}

function constructorName (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      const name = typeName(x);
      if (name === '') {
        acc.push(acc.options.anonymous);
      } else {
        acc.push(name);
      }
      return next(acc, x);
    };
  };
}

function objectSize (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.push(`(${acc.context.size})`);
      return next(acc, x);
    };
  };
}

function always (str: string): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.push(str);
      return next(acc, x);
    };
  };
}

function optionValue (key: string): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.push(acc.options[key]);
      return next(acc, x);
    };
  };
}

type ReplacerFunc = (this: any, key: string, value: any) => any;
type ReplacerAllowList = (string | number)[] | null;
type Replacer = ReplacerFunc | ReplacerAllowList;
function json (replacer?: Replacer): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      if (typeof replacer === 'function') {
        acc.push(JSON.stringify(x, replacer));
      } else if (Array.isArray(replacer)) {
        acc.push(JSON.stringify(x, replacer));
      } else {
        acc.push(JSON.stringify(x));
      }
      return next(acc, x);
    };
  };
}

function toStr (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.push(x.toString());
      return next(acc, x);
    };
  };
}

function bigint (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.push(BigInt(x).toString() + 'n');
      return next(acc, x);
    };
  };
}

function decorateArray (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.context.before(function (_node) {
        acc.push('[');
      });
      acc.context.after(function (_node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push(']');
      });
      acc.context.pre(function (_val, _key) {
        beforeEachChild(this, acc.push, acc.options);
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateSet (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.context.before(function (_node) {
        acc.push('{');
      });
      acc.context.after(function (_node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.pre(function (_val, _key) {
        beforeEachChild(this, acc.push, acc.options);
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateMap (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      const stringifyMapKey = acc.createMapKeyStringifier();
      acc.context.before(function (_node) {
        acc.push('{');
      });
      acc.context.after(function (_node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.pre(function (val, key, childState) {
        beforeEachChild(this, acc.push, acc.options);
        const keyStr = stringifyMapKey(key, childState);
        acc.push(keyStr + (acc.options.indent ? '=> ' : '=>'));
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateObject (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: any) => {
      acc.context.before(function (_node) {
        acc.push('{');
      });
      acc.context.after(function (_node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.pre(function (val, key) {
        beforeEachChild(this, acc.push, acc.options);
        acc.push(sanitizeKey(key) + (acc.options.indent ? ': ' : ':'));
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function sanitizeKey (key: string | number): string {
  const skey = String(key);
  return /^[A-Za-z_]+$/.test(skey) ? skey : JSON.stringify(skey);
}

function afterAllChildren (context: State, push: CollectorFunc, options: StringifyConfig) {
  if (options.indent && context.size !== null && context.size > 0) {
    push(options.lineSeparator);
    for (let i = 0; i < context.level; i += 1) { // indent level - 1
      push(options.indent);
    }
  }
}

function beforeEachChild (context: State, push: CollectorFunc, options: StringifyConfig) {
  if (options.indent) {
    push(options.lineSeparator);
    for (let i = 0; i <= context.level; i += 1) {
      push(options.indent);
    }
  }
}

function afterEachChild (childContext: State, push: CollectorFunc) {
  if (!childContext.isLast) {
    push(',');
  }
}

function nan (kvp: KeyValuePair, _acc: Accumulator): boolean {
  return kvp.value !== kvp.value; // eslint-disable-line no-self-compare
}

function positiveInfinity (kvp: KeyValuePair, _acc: Accumulator): boolean {
  return !isFinite(kvp.value) && kvp.value === Infinity;
}

function negativeInfinity (kvp: KeyValuePair, _acc: Accumulator): boolean {
  return !isFinite(kvp.value) && kvp.value !== Infinity;
}

function circular (_kvp: KeyValuePair, acc: Accumulator): boolean {
  return !!acc.context.circular;
}

function maxDepth (_kvp: KeyValuePair, acc: Accumulator): boolean {
  return !!(acc.options.maxDepth && acc.options.maxDepth <= acc.context.level);
}

const prune = compose(
  always('#'),
  constructorName(),
  always('#'),
  end()
);
const omitNaN = when(nan, compose(
  always('NaN'),
  end()
));
const omitPositiveInfinity = when(positiveInfinity, compose(
  always('Infinity'),
  end()
));
const omitNegativeInfinity = when(negativeInfinity, compose(
  always('-Infinity'),
  end()
));
const omitCircular = when(circular, compose(
  optionValue('circular'),
  end()
));
const omitMaxDepth = when(maxDepth, prune);

const strategies = {
  filters: {
    always,
    optionValue,
    constructorName,
    objectSize,
    json,
    toStr,
    prune,
    // truncate,
    decorateArray,
    decorateSet,
    decorateMap,
    decorateObject
  },
  flow: {
    compose,
    when,
    allowedKeys,
    // safeKeys,
    // filter,
    iterate,
    end
  },
  symbols: {
    END,
    ITERATE
  },
  always: (str: string) => compose(always(str), end()),
  json: () => compose(json(), end()),
  toStr: () => compose(toStr(), end()),
  prune: () => prune,
  number: () => {
    return compose(
      omitNaN,
      omitPositiveInfinity,
      omitNegativeInfinity,
      json(),
      end()
    );
  },
  bigint: () => compose(bigint(), end()),
  newLike: () => {
    return compose(
      always('new '),
      constructorName(),
      always('('),
      json(),
      always(')'),
      end()
    );
  },
  // array: (predicate?: Function | null) => {
  array: () => {
    return compose(
      omitCircular,
      omitMaxDepth,
      decorateArray(),
      // filter(predicate),
      iterate()
    );
  },
  // set: (predicate?: Function | null) => {
  set: () => {
    return compose(
      omitCircular,
      omitMaxDepth,
      constructorName(),
      objectSize(),
      decorateSet(),
      // filter(predicate),
      iterate()
    );
  },
  // map: (predicate?: Function | null, orderedAllowList?: string[]) => {
  map: (orderedAllowList?: string[]) => {
    return compose(
      omitCircular,
      omitMaxDepth,
      constructorName(),
      objectSize(),
      decorateMap(),
      allowedKeys(orderedAllowList),
      // filter(predicate),
      iterate()
    );
  },
  // object: (predicate?: Function | null, orderedAllowList?: string[]) => {
  object: (orderedAllowList?: string[]) => {
    return compose(
      omitCircular,
      omitMaxDepth,
      constructorName(),
      decorateObject(),
      allowedKeys(orderedAllowList),
      // safeKeys(),
      // filter(predicate),
      iterate()
    );
  }
};

export { strategies };
