import { typeName } from './type-name.mjs';
import { traverseWith } from './traverse.mjs';
import { strategies as s } from './strategies.mjs';
import type { State, InitialState, TraverseCallback } from './traverse.mjs';
import type { Accumulator, ValueHandler, CollectorFunc, StringifyConfig, MapKeyStringifierFactory } from './strategies.mjs';

type StringifyCallback = (push: CollectorFunc, item: any, state: State) => CollectorFunc;

function defaultHandlers () {
  return {
    'null': s.always('null'),
    'undefined': s.always('undefined'),
    'function': s.prune(),
    'string': s.json(),
    'boolean': s.json(),
    'number': s.number(),
    'bigint': s.bigint(),
    'symbol': s.toStr(),
    'RegExp': s.toStr(),
    'String': s.newLike(),
    'Boolean': s.newLike(),
    'Number': s.newLike(),
    'Date': s.newLike(),
    'Array': s.array(),
    'Object': s.object(),
    'Set': s.set(),
    'Map': s.map(),
    'Error': s.object(null, ['message', 'code']),
    '@default': s.object()
  };
}

function defaultOptions () {
  return {
    maxDepth: null,
    indent: null,
    anonymous: '@Anonymous',
    circular: '#@Circular#',
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
    [key: string]: ValueHandler
  }
};

type StringifyConfigAndHandlers = StringifyConfig & { handlers?: { [key: string]: ValueHandler } };

function createStringifier (customOptions?: StringifyOptions): StringifyCallback {
  const options: StringifyConfigAndHandlers = Object.assign({}, defaultOptions(), customOptions);
  const handlers = Object.assign({}, defaultHandlers(), options.handlers);
  const handlerFor = function handlerFor (val: any): ValueHandler {
    const tname = typeName(val);
    if (typeof handlers[tname] === 'function') {
      return handlers[tname];
    }
    if (tname.endsWith('Error')) {
      return handlers['Error'];
    }
    return handlers['@default'];
  };

  const createMapKeyStringifier: MapKeyStringifierFactory = () => {
    const reducer = createStringifier(options);
    return function (val: any, childState: State) {
      return walkWith (val, reducer, childState);
    };
  };

  return function stringifyAny (push: CollectorFunc, x: any, state: State) {
    const context = state;
    let handler: ValueHandler = handlerFor(context.node);
    if (context.parent && Array.isArray(context.parent.node) && !(context.key in context.parent.node)) {
      // sparse arrays
      handler = s.always('');
    }
    const acc: Accumulator = {
      createMapKeyStringifier,
      context: context,
      options: options,
      push: push
    };
    handler(acc, x);
    return push;
  };
}

function walkWith (val: any, reducer: StringifyCallback, initialState: InitialState): string {
  const root = val;
  const buffer: string[] = [];
  const acc: CollectorFunc = function (str) {
    buffer.push(str);
  };
  const cb: TraverseCallback = (x: any, state: State) => {
    reducer.call(null, acc, x, state);
  };
  traverseWith(root, cb, initialState);
  return buffer.join('');
}

function walk (val: any, reducer: StringifyCallback): string {
  const initialState = {
    path: [],
    parents: []
  };
  return walkWith (val, reducer, initialState);
}

export function stringify (val: any, options?: StringifyOptions): string {
  return walk(val, createStringifier(options));
}

export function stringifier (options?: StringifyOptions): (val: any) => string {
  return function (val: any) {
    return walk(val, createStringifier(options));
  };
}
