// minimal port of substack's traverse with Map / Set support

export function traverseAny (root, cb) {
  const initialState = {
    path: [],
    parents: []
  };
  return traverseWith(root, cb, initialState);
}

class BailOut extends Error {}

export function traverseWith (root, cb, initialState) {
  const { path, parents } = initialState;
  try {

    (function walker (node) {
      const modifiers = {};
      let keepGoing = true;
      const state = {
        node : node,
        path : [].concat(path),
        parent : parents[parents.length - 1],
        parents : [].concat(parents),
        key : path.slice(-1)[0],
        isRoot : path.length === 0,
        level : path.length,
        circular : null,
        keys : null,
        size : null,
        before : function (f) { modifiers.before = f; },
        after : function (f) { modifiers.after = f; },
        pre : function (f) { modifiers.pre = f; },
        post : function (f) { modifiers.post = f; },
        bailOut : function () {
          throw new BailOut();
        },
        skip : function () { keepGoing = false; }
      };

      function hasChildren() {
        return typeof state.node === 'object' && state.node !== null;
      }

      function markCircularRef() {
        for (let parent of parents) {
          if (parent.node === node) {
            state.circular = parent;
            break;
          }
        }
      }

      function calculateChildrenSize() {
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

      cb.call(null, state.node, state);

      if (modifiers.before) {
        // users may hack state.keys to reorder iteration
        modifiers.before.call(state, state.node);
      }

      if (!keepGoing) {
        return state;
      }

      if (hasChildren() && !state.circular) {
        parents.push(state);

        const handleChild = function (key, value, index) {
          path.push(key);
          const childNode = value;
          const preChildState = Object.assign({}, state, {
            node : childNode,
            path : [].concat(path),
            parent : parents[parents.length - 1],
            parents : [].concat(parents),
            key : path.slice(-1)[0],
            isRoot : path.length === 0,
            level : path.length,
            index : index
          });
          if (modifiers.pre) {
            modifiers.pre.call(state, childNode, key, preChildState);
          }
          const childState = walker(childNode);
          childState.isLast = (index == state.size - 1);
          if (modifiers.post) {
            modifiers.post.call(state, childState);
          }
          path.pop();
        };

        if (state.keys) {
          // when user set state.keys explicitly to filter and reorder iteration
          state.size = state.keys.length;
          let i = 0;
          for (let key of state.keys) {
            handleChild(key, state.node[key], i);
            i += 1;
          }
        } else if (Array.isArray(state.node)) {
          for (let [index, value] of state.node.entries()) {
            handleChild(index, value, index);
          }
        } else if (state.node instanceof Set) {
          for (let [index, value] of Array.from(state.node).entries()) {
            handleChild(index, value, index);
          }
        } else if (state.node instanceof Map) {
          let i = 0;
          for (let [keyObj, value] of state.node) {
            handleChild(keyObj, value, i);
            i += 1;
          }
        } else {
          let i = 0;
          for (let [keyStr, value] of Object.entries(state.node)) {
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
