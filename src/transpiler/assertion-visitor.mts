import { getParentNode, getCurrentKey } from './controller-utils.mjs';
import { NodeCreator } from './create-node-with-loc.mjs';
import { positionOf } from './position.mjs';
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

type ArgumentModificationParams = {
  controller: Controller,
  argNum: number,
  argNode: Node,
  callexp: CallExpression,
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

class ArgumentModification {
  readonly #argNum: number;
  readonly #argNode: Node;
  readonly #callexp: CallExpression;
  readonly #assertionPath: (string | number)[];
  readonly #assertionCode: string;
  readonly #transformation: Transformation;
  readonly #poweredAssertIdent: Identifier;
  readonly #positions: Map<Node, Position>;
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
    this.#positions = new Map<Node, Position>();
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

  savePosition (controller: Controller): void {
    const currentNode = controller.current();
    const targetPos = this.#calculatePosition(controller);
    this.#positions.set(currentNode, targetPos);
  }

  #targetPosition (controller: Controller): Position | undefined {
    const currentNode = controller.current();
    return this.#positions.get(currentNode);
  }

  #calculatePosition (controller: Controller): Position {
    const relativeAstPath = this.#relativeAstPath(controller);
    const code = this.#assertionCode;
    const ast = this.#callexp;
    const targetNodeInAst = relativeAstPath.reduce((parent: Node&KeyValue, key: string | number) => parent[key], ast);
    assert(this.#callexp.loc, 'callexp.loc must exist');
    const offset = this.#callexp.loc.start;
    return positionOf(targetNodeInAst, offset, code);
  }

  #relativeAstPath (controller: Controller): (string | number)[] {
    const astPath = controller.path();
    assert(astPath, 'astPath must exist');
    return astPath.slice(this.#assertionPath.length);
  }

  #insertRecorderNode (controller: Controller, methodName: string): CallExpression {
    const currentNode = controller.current();
    const relativeAstPath = this.#relativeAstPath(controller);
    const targetPos = this.#targetPosition(controller);
    assert(targetPos, 'targetPos must exist');

    const types = new NodeCreator(currentNode);
    const args = [
      currentNode,
      types.valueToNode(relativeAstPath.join('/')),
      types.valueToNode(targetPos.column)
      // types.valueToNode(targetPos.line)
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
  readonly #callexp: CallExpression;
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
      this.#binexp = currentNode.arguments[0].operator;
    }
    assert(currentNode.range, 'Node must have a range');
    const [start, end] = currentNode.range;
    this.#assertionCode = wholeCode.slice(start, end);
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
    this.#currentModification.savePosition(controller);
  }
}
