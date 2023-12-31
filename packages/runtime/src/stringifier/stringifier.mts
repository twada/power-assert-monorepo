import { typeName } from './type-name.mjs';
import { traverseWith } from './traverse.mjs';
import { strategies as s } from './strategies.mjs';
import type { State, InitialState, TraverseCallback } from './traverse.mjs';
import type { Accumulator, Component, CollectorFunc, StringifyConfig, MapKeyStringifierFactory } from './strategies.mjs';

type StringifyCallback = (push: CollectorFunc, item: unknown, state: State) => CollectorFunc;

function defaultHandlers () {
  return {
    null: s.always('null'),
    undefined: s.always('undefined'),
    function: s.function(),
    string: s.json(),
    boolean: s.json(),
    number: s.number(),
    bigint: s.bigint(),
    symbol: s.toStr(),
    RegExp: s.toStr(),
    String: s.newLike(),
    Boolean: s.newLike(),
    Number: s.newLike(),
    Date: s.newLike(),
    Array: s.array(),
    Object: s.object(),
    Set: s.set(),
    Map: s.map(),
    Error: s.object(['message', 'code', 'cause']),
    '@default': s.object()
  };
}

function defaultOptions () {
  return {
    maxDepth: null,
    indent: null,
    anonymous: 'anonymous',
    circular: '#circular#',
    snip: '..(snip)',
    lineSeparator: '\n'
  };
}

type StringifyOptions = {
  maxDepth?: number | null,
  indent?: string | null,
  anonymous?: string,
  circular?: string,
  snip?: string,
  lineSeparator?: string,
  handlers?: {
    [key: string]: Component
  }
};

type StringifyConfigAndHandlers = StringifyConfig & { handlers?: { [key: string]: Component } };

function createStringifier (customOptions?: StringifyOptions): StringifyCallback {
  const options: StringifyConfigAndHandlers = Object.assign({}, defaultOptions(), customOptions);
  const handlers = Object.assign({}, defaultHandlers(), options.handlers);
  const handlerFor = function handlerFor (val: unknown): Component {
    const tname = typeName(val);
    if (typeof handlers[tname] === 'function') {
      return handlers[tname];
    }
    if (tname.endsWith('Error')) {
      return handlers.Error;
    }
    return handlers['@default'];
  };

  const createMapKeyStringifier: MapKeyStringifierFactory = () => {
    const reducer = createStringifier(options);
    return function (val: unknown, childState: State) {
      return walkWith(val, reducer, childState);
    };
  };

  return function stringifyAny (push: CollectorFunc, x: unknown, state: State): CollectorFunc {
    const context = state;
    let handler: Component = handlerFor(context.node);
    if (context.parent && Array.isArray(context.parent.node) && !(context.key in context.parent.node)) {
      // sparse arrays
      handler = s.always('');
    }
    const acc: Accumulator = {
      createMapKeyStringifier,
      context,
      options,
      push
    };
    handler(acc, x);
    return push;
  };
}

function walkWith (val: unknown, reducer: StringifyCallback, initialState: InitialState): string {
  const root = val;
  const buffer: string[] = [];
  const acc: CollectorFunc = function (str) {
    buffer.push(str);
  };
  const cb: TraverseCallback = (x: unknown, state: State) => {
    reducer(acc, x, state);
  };
  traverseWith(root, cb, initialState);
  return buffer.join('');
}

function walk (val: unknown, reducer: StringifyCallback): string {
  const initialState = {
    path: [],
    parents: []
  };
  return walkWith(val, reducer, initialState);
}

export function stringify (val: unknown, options?: StringifyOptions): string {
  return walk(val, createStringifier(options));
}

export function stringifier (options?: StringifyOptions): (val: unknown) => string {
  return function (val: unknown) {
    return walk(val, createStringifier(options));
  };
}
