// minimal port of substack's traverse with Map / Set support
import { strict as assert } from 'node:assert';

export type State = {
  node: unknown,
  path: Array<PropertyKey>,
  parent: State,
  parents: Array<State>,
  key: PropertyKey,
  isRoot: boolean,
  level: number,
  circular: State | null,
  keys: Array<PropertyKey> | null,
  size: number | null,
  isLast?: boolean,
  beforeAllChildren: (f: BeforeAllChildrenCallback) => void,
  afterAllChildren: (f: AfterAllChildrenCallback) => void,
  beforeEachChild: (f: BeforeEachChildCallback) => void,
  afterEachChild: (f: AfterEachChildCallback) => void,
  bailOut: () => void,
  skip: () => void
};
/* eslint-ensable no-use-before-define */

export type BeforeAllChildrenCallback = (state: State, node: unknown) => void;
export type BeforeEachChildCallback = (state: State, childNode: unknown, key: PropertyKey, beforeEachChildState: State) => void;
export type AfterEachChildCallback = (state: State, afterEachChildState: State) => void;
export type AfterAllChildrenCallback = (state: State, node: unknown) => void;

export type InitialState = {
  path: Array<PropertyKey>,
  parents: Array<State>
};

export type TraverseCallback = (item: unknown, state: State) => void;

type Modifiers = {
  beforeAllChildren?: BeforeAllChildrenCallback,
  afterAllChildren?: AfterAllChildrenCallback,
  beforeEachChild?: BeforeEachChildCallback,
  afterEachChild?: AfterEachChildCallback
};

export function traverseAny (root: unknown, cb: TraverseCallback): void {
  const initialState = {
    path: [],
    parents: []
  };
  traverseWith(root, cb, initialState);
}

class BailOut extends Error {}

type PropertyKeyAccessible = { [key: PropertyKey]: unknown };

function hasChildren (node: unknown): node is object & PropertyKeyAccessible {
  return typeof node === 'object' && node !== null;
}

function objectKeysIncludeEnumerableSymbols (obj: object): (string | symbol)[] {
  const strings: (string | symbol)[] = Object.keys(obj);
  const enumerableSymbols = Object.getOwnPropertySymbols(obj).filter((sym) => {
    const desc = Object.getOwnPropertyDescriptor(obj, sym);
    return desc && desc.enumerable;
  });
  return strings.concat(enumerableSymbols);
}

function calculateChildrenSize (state: State): number {
  if (Array.isArray(state.node)) {
    return state.node.length;
  } else if (state.node instanceof Set) {
    return state.node.size;
  } else if (state.node instanceof Map) {
    return state.node.size;
  } else if (typeof state.node === 'object' && state.node !== null) {
    return objectKeysIncludeEnumerableSymbols(state.node).length;
  } else {
    assert(false, 'should not reach here');
  }
}

export function traverseWith (root: unknown, cb: TraverseCallback, initialState: InitialState): void {
  const { path, parents } = initialState;
  try {
    (function walker (node: unknown): State {
      const modifiers: Modifiers = {};
      let keepGoing = true;
      const state: State = {
        node,
        path: ([] as (string | number | symbol)[]).concat(path),
        parent: parents[parents.length - 1],
        parents: ([] as State[]).concat(parents),
        key: path.slice(-1)[0],
        isRoot: path.length === 0,
        level: path.length,
        circular: null,
        keys: null,
        size: null,
        beforeAllChildren: function (f) { modifiers.beforeAllChildren = f; },
        afterAllChildren: function (f) { modifiers.afterAllChildren = f; },
        beforeEachChild: function (f) { modifiers.beforeEachChild = f; },
        afterEachChild: function (f) { modifiers.afterEachChild = f; },
        bailOut: function () {
          throw new BailOut();
        },
        skip: function () { keepGoing = false; }
      };

      function markCircularRef (): void {
        for (const parent of parents) {
          if (parent.node === node) {
            state.circular = parent;
            break;
          }
        }
      }

      if (hasChildren(state.node)) {
        markCircularRef();
        state.size = calculateChildrenSize(state);
      }

      cb(state.node, state);

      if (modifiers.beforeAllChildren) {
        // users may hack state.keys to reorder iteration
        modifiers.beforeAllChildren.call(null, state, state.node);
      }

      if (!keepGoing) {
        return state;
      }

      if (hasChildren(state.node) && !state.circular) {
        parents.push(state);

        const handleChild = function (key: PropertyKey, value: unknown, index: number) {
          path.push(key);
          const childNode = value;
          const beforeEachChildState = Object.assign({}, state, {
            node: childNode,
            path: ([] as PropertyKey[]).concat(path),
            parent: parents[parents.length - 1],
            parents: ([] as State[]).concat(parents),
            key: path.slice(-1)[0],
            isRoot: path.length === 0,
            level: path.length,
            index
          });
          if (modifiers.beforeEachChild) {
            modifiers.beforeEachChild.call(null, state, childNode, key, beforeEachChildState);
          }
          const afterEachChildState = walker(childNode);
          assert(state.size !== null, 'state.size should be set');
          afterEachChildState.isLast = (index === state.size - 1);
          if (modifiers.afterEachChild) {
            modifiers.afterEachChild.call(null, state, afterEachChildState);
          }
          path.pop();
        };

        if (state.keys) {
          // when user set state.keys explicitly to filter and reorder iteration
          state.size = state.keys.length;
          let i = 0;
          assert(!(state.node instanceof Map), 'filtering keys in Map is not supported');
          for (const key of state.keys) {
            handleChild(key, state.node[key], i);
            i += 1;
          }
        } else if (Array.isArray(state.node)) {
          for (const [index, value] of state.node.entries()) {
            handleChild(index, value, index);
          }
        } else if (state.node instanceof Set) {
          for (const [index, value] of Array.from(state.node).entries()) {
            handleChild(index, value, index);
          }
        } else if (state.node instanceof Map) {
          let i = 0;
          for (const [keyObj, value] of state.node) {
            handleChild(keyObj, value, i);
            i += 1;
          }
        } else {
          let i = 0;
          for (const key of objectKeysIncludeEnumerableSymbols(state.node)) {
            const value = state.node[key];
            handleChild(key, value, i);
            i += 1;
          }
        }

        parents.pop();
      }

      if (modifiers.afterAllChildren) {
        modifiers.afterAllChildren.call(null, state, state.node);
      }

      return state;
    })(root);
  } catch (e) {
    if (!(e instanceof BailOut)) {
      throw e;
    }
  }
}
