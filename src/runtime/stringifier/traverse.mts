/* eslint @typescript-eslint/no-explicit-any: 0 */
// minimal port of substack's traverse with Map / Set support
import { strict as assert } from 'node:assert';

/* eslint-disable no-use-before-define */
export type State = {
  node: any,
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

export type BeforeCallback = (this: State, node: any) => void;
export type PreCallback = (this: State, childNode: any, key: string | number, preChildState: State) => void;
export type PostCallback = (this: State, childState: State) => void;
export type AfterCallback = (this: State, node: any) => void;

export type InitialState = {
  path: Array<string | number>,
  parents: Array<State>
};

export type TraverseCallback = (item: any, state: State) => void;

type Modifiers = {
  before?: BeforeCallback,
  after?: AfterCallback,
  pre?: PreCallback,
  post?: PostCallback
};

export function traverseAny (root: any, cb: TraverseCallback): void {
  const initialState = {
    path: [],
    parents: []
  };
  traverseWith(root, cb, initialState);
}

class BailOut extends Error {}

export function traverseWith (root: any, cb: TraverseCallback, initialState: InitialState): void {
  const { path, parents } = initialState;
  try {
    (function walker (node: any): State {
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

      function hasChildren (): boolean {
        return typeof state.node === 'object' && state.node !== null;
      }

      function markCircularRef (): void {
        for (const parent of parents) {
          if (parent.node === node) {
            state.circular = parent;
            break;
          }
        }
      }

      function calculateChildrenSize (): void {
        if (Array.isArray(state.node)) {
          state.size = state.node.length;
        } else if (state.node instanceof Set) {
          state.size = state.node.size;
        } else if (state.node instanceof Map) {
          state.size = state.node.size;
        } else {
          state.size = Object.keys(state.node).length;
        }
      }

      if (hasChildren()) {
        markCircularRef();
        calculateChildrenSize();
      }

      cb(state.node, state);

      if (modifiers.before) {
        // users may hack state.keys to reorder iteration
        modifiers.before.call(state, state.node);
      }

      if (!keepGoing) {
        return state;
      }

      if (hasChildren() && !state.circular) {
        parents.push(state);

        const handleChild = function (key: string | number, value: any, index: number) {
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
            modifiers.pre.call(state, childNode, key, preChildState);
          }
          const childState = walker(childNode);
          assert(state.size !== null, 'state.size should be set');
          childState.isLast = (index === state.size - 1);
          if (modifiers.post) {
            modifiers.post.call(state, childState);
          }
          path.pop();
        };

        if (state.keys) {
          // when user set state.keys explicitly to filter and reorder iteration
          state.size = state.keys.length;
          let i = 0;
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
        modifiers.after.call(state, state.node);
      }

      return state;
    })(root);
  } catch (e) {
    if (!(e instanceof BailOut)) {
      throw e;
    }
  }
}
