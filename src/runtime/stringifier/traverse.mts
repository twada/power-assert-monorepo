// minimal port of substack's traverse with Map / Set support
import { strict as assert } from 'node:assert';

/* eslint-disable no-use-before-define */
export type State = {
  node: unknown,
  path: Array<string | number>,
  parent: State,
  parents: Array<State>,
  key: string | number,
  isRoot: boolean,
  level: number,
  circular: State | null,
  keys: Array<string | number> | null,
  size: number | null,
  isLast?: boolean,
  before: (f: BeforeCallback) => void,
  after: (f: AfterCallback) => void,
  pre: (f: PreCallback) => void,
  post: (f: PostCallback) => void,
  bailOut: () => void,
  skip: () => void
};
/* eslint-ensable no-use-before-define */

export type BeforeCallback = (state: State, node: unknown) => void;
export type PreCallback = (state: State, childNode: unknown, key: string | number, preChildState: State) => void;
export type PostCallback = (state: State, childState: State) => void;
export type AfterCallback = (state: State, node: unknown) => void;

export type InitialState = {
  path: Array<string | number>,
  parents: Array<State>
};

export type TraverseCallback = (item: unknown, state: State) => void;

type Modifiers = {
  before?: BeforeCallback,
  after?: AfterCallback,
  pre?: PreCallback,
  post?: PostCallback
};

export function traverseAny (root: unknown, cb: TraverseCallback): void {
  const initialState = {
    path: [],
    parents: []
  };
  traverseWith(root, cb, initialState);
}

class BailOut extends Error {}

type PropKeyAccessible = { [key: string | number]: unknown };

function hasChildren (node: unknown): node is object & PropKeyAccessible {
  return typeof node === 'object' && node !== null;
}

function calculateChildrenSize (state: State): number {
  if (Array.isArray(state.node)) {
    return state.node.length;
  } else if (state.node instanceof Set) {
    return state.node.size;
  } else if (state.node instanceof Map) {
    return state.node.size;
  } else if (typeof state.node === 'object' && state.node !== null) {
    return Object.keys(state.node).length;
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
        path: ([] as (string|number)[]).concat(path),
        parent: parents[parents.length - 1],
        parents: ([] as State[]).concat(parents),
        key: path.slice(-1)[0],
        isRoot: path.length === 0,
        level: path.length,
        circular: null,
        keys: null,
        size: null,
        before: function (f) { modifiers.before = f; },
        after: function (f) { modifiers.after = f; },
        pre: function (f) { modifiers.pre = f; },
        post: function (f) { modifiers.post = f; },
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

      if (modifiers.before) {
        // users may hack state.keys to reorder iteration
        modifiers.before.call(null, state, state.node);
      }

      if (!keepGoing) {
        return state;
      }

      if (hasChildren(state.node) && !state.circular) {
        parents.push(state);

        const handleChild = function (key: string | number, value: unknown, index: number) {
          path.push(key);
          const childNode = value;
          const preChildState = Object.assign({}, state, {
            node: childNode,
            path: ([] as (string|number)[]).concat(path),
            parent: parents[parents.length - 1],
            parents: ([] as State[]).concat(parents),
            key: path.slice(-1)[0],
            isRoot: path.length === 0,
            level: path.length,
            index
          });
          if (modifiers.pre) {
            modifiers.pre.call(null, state, childNode, key, preChildState);
          }
          const childState = walker(childNode);
          assert(state.size !== null, 'state.size should be set');
          childState.isLast = (index === state.size - 1);
          if (modifiers.post) {
            modifiers.post.call(null, state, childState);
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
          for (const [keyStr, value] of Object.entries(state.node)) {
            handleChild(keyStr, value, i);
            i += 1;
          }
        }

        parents.pop();
      }

      if (modifiers.after) {
        modifiers.after.call(null, state, state.node);
      }

      return state;
    })(root);
  } catch (e) {
    if (!(e instanceof BailOut)) {
      throw e;
    }
  }
}
