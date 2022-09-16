/**
 * A part of valueToNode function is:
 *   Copyright (c) 2014-present Sebastian McKenzie and other contributors
 *   Released under the MIT license.
 *   https://github.com/babel/babel/blob/master/LICENSE
 *   https://github.com/babel/babel/blob/5e00c96368fdad8dc8d5fd62598098515bb3669a/packages/babel-types/src/converters/valueToNode.js
 *
 * A part of isValidIdentifier function is:
 *   Copyright (c) 2014-present Sebastian McKenzie and other contributors
 *   Released under the MIT license.
 *   https://github.com/babel/babel/blob/master/LICENSE
 *   https://github.com/babel/babel/blob/8270903ba25cd6a822c9c1ffc5ba96ec7b93076b/packages/babel-types/src/validators/isValidIdentifier.js
 *
 * A part of isPlainObject function is:
 *   Copyright JS Foundation and other contributors <https://js.foundation/>
 *   Released under the MIT license.
 *   https://github.com/lodash/lodash/blob/master/LICENSE
 *   https://github.com/lodash/lodash/blob/aa1d7d870d9cf84842ee23ff485fd24abf0ed3d1/isPlainObject.js
 */

import { replace } from 'estraverse';
import { keyword } from 'esutils';

const pToString = (obj) => Object.prototype.toString.call(obj);
const isObject = (arg) => typeof arg === 'object' && arg !== null;

class NodeCreator {
  constructor ({ loc, range }) {
    this.createNode = newNodeWithLocation({ loc, range });
  }

  identifier (name) {
    return this.createNode({
      type: 'Identifier',
      name
    });
  }

  literal (value) {
    return this.createNode({
      type: 'Literal',
      value
    });
  }

  stringLiteral (value) {
    return this.literal(value);
  }

  numericLiteral (value) {
    return this.literal(value);
  }

  booleanLiteral (value) {
    return this.literal(value);
  }

  nullLiteral () {
    return this.literal(null);
  }

  callExpression (callee, args) {
    return this.createNode({
      type: 'CallExpression',
      callee,
      arguments: args
    });
  }

  newExpression (callee, args) {
    return this.createNode({
      type: 'NewExpression',
      callee,
      arguments: args
    });
  }

  memberExpression (object, property, computed = false) {
    return this.createNode({
      type: 'MemberExpression',
      object,
      property,
      computed
    });
  }

  objectExpression (properties) {
    return this.createNode({
      type: 'ObjectExpression',
      properties
    });
  }

  property (key, value, computed = false, shorthand = false) {
    return this.createNode({
      type: 'Property',
      key,
      value,
      method: false,
      shorthand,
      computed,
      kind: 'init'
    });
  }

  objectProperty (key, value, computed = false, shorthand = false) {
    return this.property(key, value, computed, shorthand);
  }

  arrowFunctionExpression (params, body, expression = false) {
    return this.createNode({
      type: 'ArrowFunctionExpression',
      params,
      body,
      expression
    });
  }

  unaryExpression (operator, argument, prefix = true) {
    return this.createNode({
      type: 'UnaryExpression',
      operator,
      argument,
      prefix
    });
  }

  blockStatement (body) {
    return this.createNode({
      type: 'BlockStatement',
      body
    });
  }

  returnStatement (argument) {
    return this.createNode({
      type: 'ReturnStatement',
      argument
    });
  }

  variableDeclaration (kind, declarations) {
    return this.createNode({
      type: 'VariableDeclaration',
      declarations,
      kind
    });
  }

  variableDeclarator (id, init) {
    return this.createNode({
      type: 'VariableDeclarator',
      id,
      init
    });
  }

  valueToNode (value) {
    // undefined
    if (value === undefined) {
      return this.identifier('undefined');
    }
    // null
    if (value === null) {
      return this.nullLiteral();
    }
    // boolean
    if (value === true || value === false) {
      return this.booleanLiteral(value);
    }
    // strings
    if (typeof value === 'string') {
      return this.stringLiteral(value);
    }
    // numbers
    if (typeof value === 'number') {
      let result = this.numericLiteral(Math.abs(value));
      if (value < 0 || Object.is(value, -0)) {
        result = this.unaryExpression('-', result);
      }
      return result;
    }
    // object
    if (isPlainObject(value)) {
      const props = [];
      for (const key in value) {
        let nodeKey;
        if (isValidIdentifier(key)) {
          nodeKey = this.identifier(key);
        } else {
          nodeKey = this.stringLiteral(key);
        }
        props.push(this.objectProperty(nodeKey, this.valueToNode(value[key])));
      }
      return this.objectExpression(props);
    }
    throw new Error(`don't know how to turn this value into a node ${value}`);
  }
}

const isValidIdentifier = (name) => {
  if (typeof name !== 'string' || keyword.isReservedWordES6(name, true)) {
    return false;
  } else if (name === 'await') {
    // invalid in module, valid in script; better be safe (see #4952)
    return false;
  } else {
    return keyword.isIdentifierNameES6(name);
  }
};

const isPlainObject = (value) => {
  if (!isObject(value) || pToString(value) !== '[object Object]') {
    return false;
  }
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(value) === proto;
};

const updateLocRecursively = (node, { loc, range, visitorKeys }) => {
  const n = newNodeWithLocation({ loc, range });
  const visitor = {
    leave: function (currentNode, parentNode) {
      return n(currentNode);
    }
  };
  if (visitorKeys) {
    visitor.keys = visitorKeys;
  }
  replace(node, visitor);
  return node;
};

const newNodeWithLocation = ({ loc, range }) => {
  return (newNode) => {
    if (typeof loc !== 'undefined') {
      const newLoc = {
        start: {
          line: loc.start.line,
          column: loc.start.column
        },
        end: {
          line: loc.end.line,
          column: loc.end.column
        }
      };
      if (typeof loc.source !== 'undefined') {
        newLoc.source = loc.source;
      }
      newNode.loc = newLoc;
    }
    if (Array.isArray(range)) {
      newNode.range = [range[0], range[1]];
    }
    return newNode;
  };
};

export {
  updateLocRecursively,
  NodeCreator
};
