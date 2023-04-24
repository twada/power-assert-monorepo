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

import { keyword } from 'esutils';
import type {
  Node,
  Literal,
  SimpleLiteral,
  Identifier,
  Expression,
  CallExpression,
  MemberExpression,
  UnaryExpression,
  NewExpression,
  ObjectExpression,
  ArrowFunctionExpression,
  FunctionExpression,
  FunctionDeclaration,
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  SpreadElement,
  Pattern,
  Property,
  Statement,
  BlockStatement,
  ReturnStatement,
  UnaryOperator,
  StaticBlock,
  VariableDeclaration,
  VariableDeclarator,
  Program
} from 'estree';

export interface ArrowFunctionExpressionWithBlock extends ArrowFunctionExpression {
  type: 'ArrowFunctionExpression';
  body: BlockStatement;
}
export interface ArrowFunctionExpressionWithConciseBody extends ArrowFunctionExpression {
  type: 'ArrowFunctionExpression';
  body: Expression;
}
export type Scoped = Program | ScopedFunction | ScopedBlock;
export type ScopedFunction = ArrowFunctionExpressionWithBlock | FunctionDeclaration | FunctionExpression
export type ScopedBlock = BlockStatement | StaticBlock

export function isScopedFunction (node: Node): node is ScopedFunction {
  return /Function/.test(node.type) && !isArrowFunctionExpressionWithConciseBody(node);
}
export function isBlockStatement (node: Node): node is BlockStatement {
  return node.type === 'BlockStatement';
}
export function isArrowFunctionExpressionWithConciseBody (node: Node): node is ArrowFunctionExpressionWithConciseBody {
  return node.type === 'ArrowFunctionExpression' && node.expression === true;
}
export function isArrowFunctionExpressionWithBlock (node: Node): node is ArrowFunctionExpressionWithBlock {
  return node.type === 'ArrowFunctionExpression' && node.expression === false;
}
export function isScoped (node: Node): node is Scoped {
  return /^Program$|Block|Function/.test(node.type) && !isArrowFunctionExpressionWithConciseBody(node);
}

class NodeCreator {
  readonly baseNode: Node | undefined;

  constructor (baseNode?: Node) {
    // base node of node location
    this.baseNode = baseNode;
  }

  identifier (name: string): Identifier {
    return {
      type: 'Identifier',
      name
    };
  }

  stringLiteral (value: string): SimpleLiteral {
    return {
      type: 'Literal',
      value
    };
  }

  numericLiteral (value: number): SimpleLiteral {
    return {
      type: 'Literal',
      value
    };
  }

  booleanLiteral (value: boolean): SimpleLiteral {
    return {
      type: 'Literal',
      value
    };
  }

  nullLiteral (): SimpleLiteral {
    return {
      type: 'Literal',
      value: null
    };
  }

  callExpression (callee: Expression, args: Array<Expression | SpreadElement>): CallExpression {
    return {
      type: 'CallExpression',
      callee,
      arguments: args,
      optional: false
    };
  }

  newExpression (callee: Expression, args: Array<Expression | SpreadElement>): NewExpression {
    return {
      type: 'NewExpression',
      callee,
      arguments: args
    };
  }

  memberExpression (object: Expression, property: Expression, computed = false, optional = false): MemberExpression {
    return {
      type: 'MemberExpression',
      object,
      property,
      computed,
      optional
    };
  }

  objectExpression (properties: Array<Property | SpreadElement>): ObjectExpression {
    return {
      type: 'ObjectExpression',
      properties
    };
  }

  objectProperty (key: Expression, value: Expression | Pattern, computed = false, shorthand = false): Property {
    return {
      type: 'Property',
      key,
      value,
      method: false,
      shorthand,
      computed,
      kind: 'init'
    };
  }

  arrowFunctionExpression (params: Pattern[], body: BlockStatement | Expression, expression = false): ArrowFunctionExpression {
    return {
      type: 'ArrowFunctionExpression',
      params,
      body,
      expression
    };
  }

  unaryExpression (operator: UnaryOperator, argument: Expression): UnaryExpression {
    return {
      type: 'UnaryExpression',
      operator,
      argument,
      prefix: true
    };
  }

  blockStatement (body: Statement[]): BlockStatement {
    return {
      type: 'BlockStatement',
      body
    };
  }

  returnStatement (argument: Expression | null | undefined): ReturnStatement {
    return {
      type: 'ReturnStatement',
      argument
    };
  }

  importDeclaration (specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>, source: Literal): ImportDeclaration {
    return {
      type: 'ImportDeclaration',
      specifiers,
      source
    };
  }

  importSpecifier (imported: Identifier, local = null): ImportSpecifier {
    return {
      type: 'ImportSpecifier',
      imported,
      local: local || imported
    };
  }

  variableDeclaration (kind: 'var' | 'let' | 'const', declarations: VariableDeclarator[]): VariableDeclaration {
    return {
      type: 'VariableDeclaration',
      declarations,
      kind
    };
  }

  variableDeclarator (id: Pattern, init?: Expression | null): VariableDeclarator {
    return {
      type: 'VariableDeclarator',
      id,
      init
    };
  }

  valueToNode (value: any): Expression | Pattern {
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
      const result = this.numericLiteral(Math.abs(value));
      if (value < 0 || Object.is(value, -0)) {
        return this.unaryExpression('-', result);
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

function isValidIdentifier (name: any): boolean {
  if (typeof name !== 'string' || keyword.isReservedWordES6(name, true)) {
    return false;
  } else if (name === 'await') {
    // invalid in module, valid in script; better be safe (see #4952)
    return false;
  } else {
    return keyword.isIdentifierNameES6(name);
  }
}

function isPlainObject (value: any): boolean {
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
}

function pToString (obj: any): string {
  return Object.prototype.toString.call(obj);
}
function isObject (arg: any): boolean {
  return typeof arg === 'object' && arg !== null;
}

export {
  NodeCreator
};
