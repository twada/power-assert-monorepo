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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyValueStore = { [key: PropertyKey]: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyValuePair = { key: PropertyKey, value: any };

export type CollectorFunc = (str: string) => void;

export type MapKeyStringifier = (val: unknown, childState: State) => string;
export type MapKeyStringifierFactory = () => MapKeyStringifier;
export type Accumulator = {
  push: CollectorFunc,
  context: State,
  options: StringifyConfig & KeyValueStore,
  createMapKeyStringifier: MapKeyStringifierFactory
};
type Guard = (kvp: KeyValuePair, acc: Accumulator) => boolean;

export type Component = (acc: Accumulator, x: unknown) => Direction;
type Composable = (next: Component) => Component;

// chain of components should end with end() or iterate()
function compose (...components: Composable[]): Component {
  return components.reduceRight((right: Component, left: Composable) => left(right), terminator);
}

const terminator: Component = (_acc: Accumulator, _x: unknown) => {
  assert(false, 'chain of composable components should end with end() or iterate()');
};

// skip children
function end (): Composable {
  return (_next: Component) => {
    return (acc: Accumulator, _x: unknown) => {
      acc.context.skip();
      return END;
    };
  };
}

// iterate children
function iterate (): Composable {
  return (_next: Component) => {
    return (_acc: Accumulator, _x: unknown) => ITERATE;
  };
}

function allowedKeys (orderedAllowList?: string[]): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      if (!Array.isArray(x) && Array.isArray(orderedAllowList)) {
        acc.context.keys = orderedAllowList.filter((propKey) => Object.prototype.hasOwnProperty.call(x, propKey));
      }
      return next(acc, x);
    };
  };
}

function when (guard: Guard, then: Component): Composable {
  return (next) => {
    return (acc: Accumulator, x: unknown) => {
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
    return (acc: Accumulator, x: unknown) => {
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
    return (acc: Accumulator, x: unknown) => {
      acc.push(`(${acc.context.size})`);
      return next(acc, x);
    };
  };
}

function always (str: string): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      acc.push(str);
      return next(acc, x);
    };
  };
}

function optionValue (key: string): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      acc.push(acc.options[key]);
      return next(acc, x);
    };
  };
}

type ReplacerFunc = (this: unknown, key: string, value: unknown) => unknown;
type ReplacerAllowList = (string | number)[] | null;
type Replacer = ReplacerFunc | ReplacerAllowList;
function json (replacer?: Replacer): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
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
    return (acc: Accumulator, x: unknown) => {
      acc.push(String(x));
      return next(acc, x);
    };
  };
}

type HasName = { name: string };
function hasName (x: unknown): x is HasName {
  return typeof x === 'function' || (typeof x === 'object' && x !== null && Object.hasOwn(x, 'name'));
}

function itsName (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      if (hasName(x)) {
        const name = x.name;
        if (name === '') {
          acc.push(acc.options.anonymous);
        } else {
          acc.push(name);
        }
      } else {
        acc.push(acc.options.anonymous);
      }
      return next(acc, x);
    };
  };
}

function bigint (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      if (typeof x === 'bigint' || typeof x === 'number' || typeof x === 'string' || typeof x === 'boolean') {
        acc.push(BigInt(x).toString() + 'n');
      }
      return next(acc, x);
    };
  };
}

function decorateArray (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      acc.context.beforeAllChildren((_state: State, _node: unknown) => {
        acc.push('[');
      });
      acc.context.afterAllChildren((state: State, _node: unknown) => {
        afterAllChildren(state, acc.push, acc.options);
        acc.push(']');
      });
      acc.context.beforeEachChild((state: State, _val: unknown, _key: PropertyKey, _beforeEachChildState: State) => {
        beforeEachChild(state, acc.push, acc.options);
      });
      acc.context.afterEachChild((_state: State, afterEachChildState: State) => {
        afterEachChild(afterEachChildState, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateSet (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      acc.context.beforeAllChildren((_state: State, _node: unknown) => {
        acc.push('{');
      });
      acc.context.afterAllChildren((state: State, _node: unknown) => {
        afterAllChildren(state, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.beforeEachChild((state: State, _val: unknown, _key: PropertyKey, _beforeEachChildState: State) => {
        beforeEachChild(state, acc.push, acc.options);
      });
      acc.context.afterEachChild((_state: State, afterEachChildState: State) => {
        afterEachChild(afterEachChildState, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateMap (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      const stringifyMapKey = acc.createMapKeyStringifier();
      acc.context.beforeAllChildren((_state: State, _node: unknown) => {
        acc.push('{');
      });
      acc.context.afterAllChildren((state: State, _node: unknown) => {
        afterAllChildren(state, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.beforeEachChild((state: State, _val: unknown, key: PropertyKey, beforeEachChildState: State) => {
        beforeEachChild(state, acc.push, acc.options);
        const keyStr = stringifyMapKey(key, beforeEachChildState);
        acc.push(keyStr + (acc.options.indent ? '=> ' : '=>'));
      });
      acc.context.afterEachChild((_state: State, afterEachChildState: State) => {
        afterEachChild(afterEachChildState, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateObject (): Composable {
  return (next: Component) => {
    return (acc: Accumulator, x: unknown) => {
      acc.context.beforeAllChildren((_state: State, _node: unknown) => {
        acc.push('{');
      });
      acc.context.afterAllChildren((state: State, _node: unknown) => {
        afterAllChildren(state, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.beforeEachChild((state: State, _val: unknown, key: PropertyKey, _beforeEachChildState: State) => {
        beforeEachChild(state, acc.push, acc.options);
        acc.push(sanitizeKey(key) + (acc.options.indent ? ': ' : ':'));
      });
      acc.context.afterEachChild((_state: State, afterEachChildState: State) => {
        afterEachChild(afterEachChildState, acc.push);
      });
      return next(acc, x);
    };
  };
}

function sanitizeKey (key: PropertyKey): string {
  if (typeof key === 'symbol') {
    return key.toString();
  } else {
    const skey = String(key);
    return /^(?!\d)[\w$]*$/.test(skey) ? skey : JSON.stringify(skey);
  }
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
  always: (str: string) => compose(always(str), end()),
  json: () => compose(json(), end()),
  toStr: () => compose(toStr(), end()),
  prune: () => prune,
  function: () => compose(
    constructorName(),
    always('@'),
    itsName(),
    end()),
  number: () => compose(
    omitNaN,
    omitPositiveInfinity,
    omitNegativeInfinity,
    json(),
    end()
  ),
  bigint: () => compose(bigint(), end()),
  newLike: () => compose(
    always('new '),
    constructorName(),
    always('('),
    json(),
    always(')'),
    end()
  ),
  // array: (predicate?: Function | null) => {
  array: () => compose(
    omitCircular,
    omitMaxDepth,
    decorateArray(),
    // filter(predicate),
    iterate()
  ),
  // set: (predicate?: Function | null) => {
  set: () => compose(
    omitCircular,
    omitMaxDepth,
    constructorName(),
    objectSize(),
    decorateSet(),
    // filter(predicate),
    iterate()
  ),
  // map: (predicate?: Function | null, orderedAllowList?: string[]) => {
  // map: (orderedAllowList?: string[]) => {
  map: () => compose(
    omitCircular,
    omitMaxDepth,
    constructorName(),
    objectSize(),
    decorateMap(),
    // allowedKeys(orderedAllowList),
    // filter(predicate),
    iterate()
  ),
  // object: (predicate?: Function | null, orderedAllowList?: string[]) => {
  object: (orderedAllowList?: string[]) => compose(
    omitCircular,
    omitMaxDepth,
    constructorName(),
    decorateObject(),
    allowedKeys(orderedAllowList),
    // safeKeys(),
    // filter(predicate),
    iterate()
  )
};

export { strategies };
