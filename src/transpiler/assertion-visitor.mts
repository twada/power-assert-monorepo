import { getParentNode, getCurrentKey } from './controller-utils.mjs';
import { NodeCreator } from './create-node-with-loc.mjs';
import { searchAddressByRange } from './range.mjs';
import { searchAddressByPosition } from './position.mjs';
import { toBeSkipped } from './rules/to-be-skipped.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';
import { strict as assert } from 'node:assert';

import type { Transformation } from './transformation.mjs';
import type { Controller } from 'estraverse';
import type {
  Node,
  Identifier,
  Expression,
  CallExpression,
  MemberExpression,
  SpreadElement,
  Position
} from 'estree';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyValue = { [key: string]: any };

type AcornSwcLikeNode = Node & {
  start?: number;
  end?: number;
};

type AcornSwcNode = Node & {
  start: number;
  end: number;
};

type ArgumentModificationParams = {
  controller: Controller,
  argNum: number,
  argNode: Node,
  callexp: CallExpression & AcornSwcLikeNode,
  assertionPath: (string | number)[],
  assertionCode: string,
  transformation: Transformation,
  poweredAssertIdent: Identifier
};

type ExtraProps = {
  [key: string]: string | number | boolean | null | undefined
};

function isMemberExpression (node: Node): node is MemberExpression {
  return node && node.type === 'MemberExpression';
}

function isAcornSwcNode (node: Node): node is AcornSwcNode {
  return Object.hasOwn(node, 'start') && Object.hasOwn(node, 'end');
}

function getStartRangeValue (node: Node): number {
  if (node.range) {
    return node.range[0];
  }
  if (isAcornSwcNode(node)) {
    return node.start;
  } else {
    assert(false, 'Node must have range or start/end');
  }
}

// extract string from code between start and end position
export function extractArea (code: string, start: Position, end: Position): string {
  // split lines by CR/LF or LF ?
  // const lines = code.split(/\r?\n/);
  const lines = code.split(/\n/);
  const startLineStr = lines[start.line - 1];
  const endLineStr = lines[end.line - 1];
  if (start.line === end.line) {
    return startLineStr.slice(start.column, end.column);
  } else if (start.line + 1 === end.line) {
    return startLineStr.slice(start.column) + '\n' + endLineStr.slice(0, end.column);
  } else {
    const middleLines = lines.slice(start.line, end.line - 1);
    return startLineStr.slice(start.column) + '\n' + middleLines.join('\n') + '\n' + endLineStr.slice(0, end.column);
  }
}

class ArgumentModification {
  readonly #argNum: number;
  readonly #argNode: Node;
  readonly #callexp: CallExpression & AcornSwcLikeNode;
  readonly #assertionPath: (string | number)[];
  readonly #assertionCode: string;
  readonly #transformation: Transformation;
  readonly #poweredAssertIdent: Identifier;
  readonly #addresses: Map<Node, number>;
  readonly #argumentRecorderIdent: Identifier;
  #argumentModified: boolean;

  constructor ({ controller, argNum, argNode, callexp, assertionPath, assertionCode, transformation, poweredAssertIdent }: ArgumentModificationParams) {
    this.#argNum = argNum;
    this.#argNode = argNode;
    this.#callexp = callexp;
    this.#assertionPath = assertionPath;
    this.#assertionCode = assertionCode;
    this.#transformation = transformation;
    this.#poweredAssertIdent = poweredAssertIdent;
    this.#argumentModified = false;
    this.#addresses = new Map<Node, number>();
    const recorderVariableName = this.#transformation.generateUniqueName('arg');
    const currentNode = controller.current();
    const types = new NodeCreator(currentNode);
    const ident = types.identifier(recorderVariableName);
    const init = types.callExpression(
      types.memberExpression(this.#poweredAssertIdent, types.identifier('recorder')), [
        types.numericLiteral(this.#argNum)
      ]
    );
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    this.#transformation.insertDeclIntoCurrentBlock(controller, decl);
    this.#argumentRecorderIdent = ident;
  }

  leave (controller: Controller): Node {
    const currentNode = controller.current();
    const shouldCaptureValue = toBeCaptured(controller);
    // const pathToBeCaptured = shouldCaptureValue ? controller.path() : null;
    const shouldCaptureArgument = this.isArgumentModified() || shouldCaptureValue;
    const resultNode = shouldCaptureArgument ? this.#captureArgument(controller) : currentNode;
    return resultNode;
  }

  isArgumentModified (): boolean {
    return !!this.#argumentModified;
  }

  isLeaving (controller: Controller): boolean {
    return this.#argNode === controller.current();
  }

  captureNode (controller: Controller): CallExpression {
    return this.#insertRecorderNode(controller, 'tap');
  }

  #captureArgument (controller: Controller): CallExpression {
    return this.#insertRecorderNode(controller, 'rec');
  }

  saveAddress (controller: Controller): void {
    const currentNode = controller.current();
    const targetAddr = this.#calculateAddress(controller);
    this.#addresses.set(currentNode, targetAddr);
  }

  #targetAddress (controller: Controller): number | undefined {
    const currentNode = controller.current();
    return this.#addresses.get(currentNode);
  }

  #calculateAddress (controller: Controller): number {
    const relativeAstPath = this.#relativeAstPath(controller);
    const code = this.#assertionCode;
    const ast = this.#callexp;
    const targetNodeInAst = relativeAstPath.reduce((parent: Node&KeyValue&AcornSwcLikeNode, key: string | number) => parent[key], ast);
    if (this.#callexp.loc) {
      const offsetPosition = this.#callexp.loc.start;
      return searchAddressByPosition(targetNodeInAst, offsetPosition, code);
    } else {
      const offset = getStartRangeValue(this.#callexp);
      return searchAddressByRange(targetNodeInAst, offset, code);
    }
  }

  #relativeAstPath (controller: Controller): (string | number)[] {
    const astPath = controller.path();
    assert(astPath, 'astPath must exist');
    return astPath.slice(this.#assertionPath.length);
  }

  #insertRecorderNode (controller: Controller, methodName: string): CallExpression {
    const currentNode = controller.current();
    const relativeAstPath = this.#relativeAstPath(controller);
    const targetAddr = this.#targetAddress(controller);
    assert(typeof targetAddr !== 'undefined', 'targetAddr must exist');

    const types = new NodeCreator(currentNode);
    const args = [
      currentNode,
      types.valueToNode(relativeAstPath.join('/')),
      types.valueToNode(targetAddr)
    ];

    const receiver = this.#argumentRecorderIdent;
    const newNode = types.callExpression(
      types.memberExpression(receiver, types.identifier(methodName)),
      args as Array<Expression | SpreadElement>
    );
    this.#argumentModified = true;
    return newNode;
  }
}

export class AssertionVisitor {
  readonly #transformation: Transformation;
  readonly #decoratorFunctionIdent: Identifier;
  #currentModification: ArgumentModification | null;
  readonly #argumentModifications: ArgumentModification[];

  readonly #assertionPath: (string | number)[];
  readonly #callexp: CallExpression & AcornSwcLikeNode;
  readonly #calleeNode: Expression;
  readonly #assertionCode: string;
  readonly #poweredAssertIdent: Identifier;
  readonly #binexp: string | undefined;

  get assertionCode () {
    return this.#assertionCode;
  }

  get currentModification () {
    return this.#currentModification;
  }

  get argumentModifications () {
    return ([] as ArgumentModification[]).concat(this.#argumentModifications);
  }

  get poweredAssertIdent () {
    return structuredClone(this.#poweredAssertIdent);
  }

  constructor (controller: Controller, transformation: Transformation, decoratorFunctionIdent: Identifier, wholeCode: string) {
    this.#transformation = transformation;
    this.#decoratorFunctionIdent = decoratorFunctionIdent;
    this.#currentModification = null;
    this.#argumentModifications = [];
    const nodepath = controller.path();
    assert(nodepath, 'Node path must exist');
    this.#assertionPath = ([] as (string | number)[]).concat(nodepath);
    const currentNode = controller.current();
    assert(currentNode.type === 'CallExpression', 'Node must be a CallExpression');
    this.#callexp = currentNode;
    assert(currentNode.callee.type !== 'Super', 'Super is not supported');
    this.#calleeNode = currentNode.callee;
    if (currentNode.arguments.length === 1 && currentNode.arguments[0].type === 'BinaryExpression') {
      const operator = currentNode.arguments[0].operator;
      if (operator === '==' || operator === '===' || operator === '!=' || operator === '!==') {
        this.#binexp = operator;
      }
    }
    if (this.#callexp.range !== undefined) {
      this.#assertionCode = wholeCode.slice(this.#callexp.range[0], this.#callexp.range[1]);
    } else if (this.#callexp.start !== undefined && this.#callexp.end !== undefined) {
      // Acorn/SWC like node (has start and end property)
      this.#assertionCode = wholeCode.slice(this.#callexp.start, this.#callexp.end);
    } else if (this.#callexp.loc) {
      this.#assertionCode = extractArea(wholeCode, this.#callexp.loc.start, this.#callexp.loc.end);
    } else {
      assert(false, 'Node must have a loc or range or start/end');
    }
    this.#poweredAssertIdent = this.#decorateAssert(controller);
  }

  leave (controller: Controller): Node {
    try {
      return this.isModified() ? this.#replaceWithDecoratedAssert(controller) : controller.current();
    } finally {
      this.#argumentModifications.length = 0;
    }
  }

  isModified (): boolean {
    return this.#argumentModifications.some((am) => am.isArgumentModified());
  }

  #replaceWithDecoratedAssert (controller: Controller): CallExpression {
    const currentNode = controller.current();
    assert(currentNode.type === 'CallExpression', 'Node must be a CallExpression');
    const types = new NodeCreator(currentNode);
    const replacedNode = types.callExpression(
      types.memberExpression(this.#poweredAssertIdent, types.identifier('run')), currentNode.arguments
    );
    return replacedNode;
  }

  #decorateAssert (controller: Controller): Identifier {
    const currentNode = controller.current();
    const transformation = this.#transformation;
    const types = new NodeCreator(currentNode);
    // extra properties are not required for now
    const extraProps: ExtraProps = {};
    if (this.#binexp) {
      extraProps.binexp = this.#binexp;
    }
    // if (this.withinAsync) {
    //   extraProps.async = true;
    // }
    // if (this.withinGenerator) {
    //   extraProps.generator = true;
    // }
    const propsNode = types.valueToNode(extraProps);
    assert(propsNode.type === 'ObjectExpression', 'propsNode must be an ObjectExpression');
    const callee = this.#calleeNode;
    const receiver = isMemberExpression(callee) ? callee.object : types.nullLiteral();
    const codeLiteral = types.stringLiteral(this.#assertionCode);
    assert(receiver.type !== 'Super', 'Super is not supported');
    const args: Array<Expression | SpreadElement> = [
      callee,
      receiver,
      codeLiteral
    ];
    if (propsNode.properties.length > 0) {
      args.push(propsNode);
    }
    const init = types.callExpression(this.#decoratorFunctionIdent, args);
    const ident = types.identifier(transformation.generateUniqueName('asrt'));
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    transformation.insertDeclIntoCurrentBlock(controller, decl);
    return ident;
  }

  enterArgument (controller: Controller): undefined {
    const currentNode = controller.current();
    // going to capture every argument
    const argNum = this.#argumentModifications.length;
    const modification = new ArgumentModification({
      controller,
      argNum,
      argNode: currentNode,
      callexp: this.#callexp,
      assertionPath: this.#assertionPath,
      assertionCode: this.#assertionCode,
      transformation: this.#transformation,
      poweredAssertIdent: this.#poweredAssertIdent
    });
    // modification.enter(controller);
    this.#argumentModifications.push(modification);
    this.#currentModification = modification;
    return undefined;
  }

  isLeavingArgument (controller: Controller): boolean {
    return !!this.#currentModification?.isLeaving(controller);
  }

  leaveArgument (controller: Controller): Node {
    assert(this.#currentModification, 'currentModification must exist');
    const retNode = this.#currentModification.leave(controller);
    this.#currentModification = null;
    return retNode;
  }

  isCapturingArgument (): boolean {
    return !!this.#currentModification;
  }

  isNodeToBeSkipped (controller: Controller): boolean {
    const currentNode = controller.current();
    if (currentNode === this.#calleeNode) {
      return true;
    }
    const parentNode = getParentNode(controller);
    assert(parentNode, 'parentNode must exist');
    const currentKey = getCurrentKey(controller);
    return toBeSkipped({ currentNode, parentNode, currentKey });
  }

  isNodeToBeCaptured (controller: Controller): boolean {
    return toBeCaptured(controller);
  }

  leaveNodeToBeCaptured (controller: Controller): CallExpression {
    assert(this.#currentModification, 'currentModification must exist');
    return this.#currentModification.captureNode(controller);
  }

  enterNodeToBeCaptured (controller: Controller): void {
    assert(this.#currentModification, 'currentModification must exist');
    this.#currentModification.saveAddress(controller);
  }
}
