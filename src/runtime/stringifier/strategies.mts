import { typeName } from './type-name.mjs';

// could be replaced with symbols?
const END = {};
const ITERATE = {};

// arguments should end with end or iterate
function compose () {
  const filters = Array.from(arguments);
  return filters.reduceRight((right, left) => left(right));
}

// skip children
function end () {
  return (acc, x) => {
    acc.context.skip();
    return END;
  };
}

// iterate children
function iterate () {
  return (acc, x) => ITERATE;
}

function allowedKeys (orderedAllowList) {
  return (next) => {
    return (acc, x) => {
      if (!Array.isArray(x) && Array.isArray(orderedAllowList)) {
        acc.context.keys = orderedAllowList.filter((propKey) => x.hasOwnProperty(propKey));
      }
      return next(acc, x);
    };
  };
}

function when (guard, then) {
  return (next) => {
    return (acc, x) => {
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

function constructorName () {
  return (next) => {
    return (acc, x) => {
      let name = typeName(x);
      if (name === '') {
        name = acc.options.anonymous;
      }
      acc.push(name);
      return next(acc, x);
    };
  };
}

function objectSize () {
  return (next) => {
    return (acc, x) => {
      acc.push(`(${acc.context.size})`);
      return next(acc, x);
    };
  };
}

function always (str) {
  return (next) => {
    return (acc, x) => {
      acc.push(str);
      return next(acc, x);
    };
  };
}

function optionValue (key) {
  return (next) => {
    return (acc, x) => {
      acc.push(acc.options[key]);
      return next(acc, x);
    };
  };
}

function json (replacer) {
  return (next) => {
    return (acc, x) => {
      acc.push(JSON.stringify(x, replacer));
      return next(acc, x);
    };
  };
}

function toStr () {
  return (next) => {
    return (acc, x) => {
      acc.push(x.toString());
      return next(acc, x);
    };
  };
}

function bigint () {
  return (next) => {
    return (acc, x) => {
      acc.push(BigInt(x).toString() + 'n');
      return next(acc, x);
    };
  };
}

function decorateArray () {
  return (next) => {
    return (acc, x) => {
      acc.context.before(function (node) {
        acc.push('[');
      });
      acc.context.after(function (node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push(']');
      });
      acc.context.pre(function (val, key) {
        beforeEachChild(this, acc.push, acc.options);
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateSet () {
  return (next) => {
    return (acc, x) => {
      acc.context.before(function (node) {
        acc.push('{');
      });
      acc.context.after(function (node) {
        afterAllChildren(this, acc.push, acc.options);
        acc.push('}');
      });
      acc.context.pre(function (val, key) {
        beforeEachChild(this, acc.push, acc.options);
      });
      acc.context.post(function (childContext) {
        afterEachChild(childContext, acc.push);
      });
      return next(acc, x);
    };
  };
}

function decorateMap () {
  return (next) => {
    return (acc, x) => {
      const stringifyMapKey = acc.createMapKeyStringifier();
      acc.context.before(function (node) {
        acc.push('{');
      });
      acc.context.after(function (node) {
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

function decorateObject () {
  return (next) => {
    return (acc, x) => {
      acc.context.before(function (node) {
        acc.push('{');
      });
      acc.context.after(function (node) {
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

function sanitizeKey (key) {
  return /^[A-Za-z_]+$/.test(key) ? key : JSON.stringify(key);
}

function afterAllChildren (context, push, options) {
  if (options.indent && context.size > 0) {
    push(options.lineSeparator);
    for (let i = 0; i < context.level; i += 1) { // indent level - 1
      push(options.indent);
    }
  }
}

function beforeEachChild (context, push, options) {
  if (options.indent) {
    push(options.lineSeparator);
    for (let i = 0; i <= context.level; i += 1) {
      push(options.indent);
    }
  }
}

function afterEachChild (childContext, push) {
  if (!childContext.isLast) {
    push(',');
  }
}

function nan (kvp, acc) {
  return kvp.value !== kvp.value; // eslint-disable-line no-self-compare
}

function positiveInfinity (kvp, acc) {
  return !isFinite(kvp.value) && kvp.value === Infinity;
}

function negativeInfinity (kvp, acc) {
  return !isFinite(kvp.value) && kvp.value !== Infinity;
}

function circular (kvp, acc) {
  return acc.context.circular;
}

function maxDepth (kvp, acc) {
  return (acc.options.maxDepth && acc.options.maxDepth <= acc.context.level);
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
  always: (str) => compose(always(str), end()),
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
  array: (predicate) => {
    return compose(
      omitCircular,
      omitMaxDepth,
      decorateArray(),
      // filter(predicate),
      iterate()
    );
  },
  set: (predicate) => {
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
  map: (predicate, orderedAllowList) => {
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
  object: (predicate, orderedAllowList) => {
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
