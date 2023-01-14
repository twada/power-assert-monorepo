import { typeName } from './type-name.mjs';
import { traverseWith } from './traverse.mjs';
import { strategies as s } from './strategies.mjs';

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

function createStringifier (customOptions) {
  const options = Object.assign({}, defaultOptions(), customOptions);
  const handlers = Object.assign({}, defaultHandlers(), options.handlers);
  const handlerFor = function handlerFor (val) {
    const tname = typeName(val);
    if (typeof handlers[tname] === 'function') {
      return handlers[tname];
    }
    if (tname.endsWith('Error')) {
      return handlers['Error'];
    }
    return handlers['@default'];
  };

  const createMapKeyStringifier = () => {
    const reducer = createStringifier(options);
    return function (val, childState) {
      return walkWith (val, reducer, childState);
    };
  };

  return function stringifyAny (push, x, state) {
    const context = state;
    let handler = handlerFor(context.node);
    if (context.parent && Array.isArray(context.parent.node) && !(context.key in context.parent.node)) {
      // sparse arrays
      handler = s.always('');
    }
    const acc = {
      createMapKeyStringifier,
      context: context,
      options: options,
      push: push
    };
    handler(acc, x);
    return push;
  };
}

function walkWith (val, reducer, initialState) {
  const root = val;
  const buffer = [];
  const acc = function (str) {
    buffer.push(str);
  };
  const cb = (x, state) => {
    reducer.call(null, acc, x, state);
  };
  traverseWith(root, cb, initialState);
  return buffer.join('');
}

function walk (val, reducer) {
  const initialState = {
    path: [],
    parents: [],
    alive: true
  };
  return walkWith (val, reducer, initialState);
}

export function stringify (val, options) {
  return walk(val, createStringifier(options));
}

export function stringifier (options) {
  return function (val) {
    return walk(val, createStringifier(options));
  };
}
