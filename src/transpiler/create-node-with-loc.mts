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
export type ScopedFunction = ArrowFunctionExpressionWithBlock | FunctionDeclaration | FunctionExpression
export type ScopedBlock = BlockStatement | StaticBlock
export type Scoped = Program | ScopedFunction | ScopedBlock;

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

function withLoc (sourceNode: Node) {
  return function<T extends Node> (destNode: T): T {
    destNode.loc = sourceNode.loc;
    destNode.range = sourceNode.range;
    return destNode;
  };
}

export class NodeCreator {
  readonly newNode: <T extends Node>(destNode: T) => T;

  constructor (sourceNode: Node) {
    this.newNode = withLoc(sourceNode);
  }

  identifier (name: string): Identifier {
    return this.newNode<Identifier>({
      type: 'Identifier',
      name
    });
  }

  stringLiteral (value: string): SimpleLiteral {
    return this.newNode<SimpleLiteral>({
      type: 'Literal',
      value
    });
  }

  numericLiteral (value: number): SimpleLiteral {
    return this.newNode<SimpleLiteral>({
      type: 'Literal',
      value
    });
  }

  booleanLiteral (value: boolean): SimpleLiteral {
    return this.newNode<SimpleLiteral>({
      type: 'Literal',
      value
    });
  }

  nullLiteral (): SimpleLiteral {
    return this.newNode<SimpleLiteral>({
      type: 'Literal',
      value: null
    });
  }

  callExpression (callee: Expression, args: Array<Expression | SpreadElement>): CallExpression {
    return this.newNode<CallExpression>({
      type: 'CallExpression',
      callee,
      arguments: args,
      optional: false
    });
  }

  newExpression (callee: Expression, args: Array<Expression | SpreadElement>): NewExpression {
    return this.newNode<NewExpression>({
      type: 'NewExpression',
      callee,
      arguments: args
    });
  }

  memberExpression (object: Expression, property: Expression, computed = false, optional = false): MemberExpression {
    return this.newNode<MemberExpression>({
      type: 'MemberExpression',
      object,
      property,
      computed,
      optional
    });
  }

  objectExpression (properties: Array<Property | SpreadElement>): ObjectExpression {
    return this.newNode<ObjectExpression>({
      type: 'ObjectExpression',
      properties
    });
  }

  objectProperty (key: Expression, value: Expression | Pattern, computed = false, shorthand = false): Property {
    return this.newNode<Property>({
      type: 'Property',
      key,
      value,
      method: false,
      shorthand,
      computed,
      kind: 'init'
    });
  }

  arrowFunctionExpression (params: Pattern[], body: BlockStatement | Expression, expression = false): ArrowFunctionExpression {
    return this.newNode<ArrowFunctionExpression>({
      type: 'ArrowFunctionExpression',
      params,
      body,
      expression
    });
  }

  unaryExpression (operator: UnaryOperator, argument: Expression): UnaryExpression {
    return this.newNode<UnaryExpression>({
      type: 'UnaryExpression',
      operator,
      argument,
      prefix: true
    });
  }

  blockStatement (body: Statement[]): BlockStatement {
    return this.newNode<BlockStatement>({
      type: 'BlockStatement',
      body
    });
  }

  returnStatement (argument: Expression | null | undefined): ReturnStatement {
    return this.newNode<ReturnStatement>({
      type: 'ReturnStatement',
      argument
    });
  }

  importDeclaration (specifiers: Array<ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier>, source: Literal): ImportDeclaration {
    return this.newNode<ImportDeclaration>({
      type: 'ImportDeclaration',
      specifiers,
      source
    });
  }

  importSpecifier (imported: Identifier, local = null): ImportSpecifier {
    return this.newNode<ImportSpecifier>({
      type: 'ImportSpecifier',
      imported,
      local: local || imported
    });
  }

  variableDeclaration (kind: 'var' | 'let' | 'const', declarations: VariableDeclarator[]): VariableDeclaration {
    return this.newNode<VariableDeclaration>({
      type: 'VariableDeclaration',
      declarations,
      kind
    });
  }

  variableDeclarator (id: Pattern, init?: Expression | null): VariableDeclarator {
    return this.newNode<VariableDeclarator>({
      type: 'VariableDeclarator',
      id,
      init
    });
  }

  valueToNode (value: unknown): Expression | Pattern {
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

function isValidIdentifier (name: string): boolean {
  if (typeof name !== 'string' || keyword.isReservedWordES6(name, true)) {
    return false;
  } else if (name === 'await') {
    // invalid in module, valid in script; better be safe (see #4952)
    return false;
  } else {
    return keyword.isIdentifierNameES6(name);
  }
}

type PropKeyAccessible = {
  [key: string]: unknown;
}

function isPlainObject (value: unknown): value is object & PropKeyAccessible {
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

function pToString (obj: unknown): string {
  return Object.prototype.toString.call(obj);
}

function isObject (arg: unknown): boolean {
  return typeof arg === 'object' && arg !== null;
}
