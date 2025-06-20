import { nodeFactory } from './node-factory.mjs';
import { searchAddress } from './address.mjs';
import { toBeSkipped } from './rules/to-be-skipped.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';
import { strict as assert } from 'node:assert';

import type { Address } from './address.mjs';
import type { Transformation } from './transformation.mjs';
import type {
  Node,
  Identifier,
  Expression,
  CallExpression,
  MemberExpression,
  SpreadElement,
  Position
} from 'estree';

type NodeKey = string | number | symbol | null | undefined;

type ControllerLike = {
  currentNode: Node,
  parentNode: Node | null,
  currentKey: NodeKey,
};

// type KeyValue = { [key: string]: any };

type AcornSwcLikeNode = Node & {
  start?: number;
  end?: number;
};

type AcornSwcNode = Node & {
  start: number;
  end: number;
};

// type AstPath = (string | number)[];
type AstPath = NodeKey[];

type ArgumentModificationParams = {
  currentNode: Node,
  argNum: number,
  argNode: Node,
  callexp: CallExpression & AcornSwcLikeNode,
  assertionPath: AstPath,
  assertionCode: string,
  transformation: Transformation,
  poweredAssertIdent: Identifier,
  evalOrder: number,
  binexp?: string
};

type ExtraProps = {
  [key: string]: string | number | boolean | null | undefined
};

export type StepInfo = {
  markerPos: number;
  startPos: number;
  endPos: number;
  evalOrder: number;
}

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
  readonly #assertionPath: AstPath;
  readonly #assertionCode: string;
  readonly #transformation: Transformation;
  readonly #poweredAssertIdent: Identifier;
  readonly #addresses: Map<Node, StepInfo>;
  readonly #argumentRecorderIdent: Identifier;
  readonly #binexp: string | undefined;
  #evalOrder: number;
  #argumentModified: boolean;

  constructor ({ currentNode, argNum, argNode, callexp, assertionPath, assertionCode, transformation, poweredAssertIdent, evalOrder, binexp }: ArgumentModificationParams) {
    this.#argNum = argNum;
    this.#argNode = argNode;
    this.#callexp = callexp;
    this.#assertionPath = assertionPath;
    this.#assertionCode = assertionCode;
    this.#transformation = transformation;
    this.#poweredAssertIdent = poweredAssertIdent;
    this.#binexp = binexp;
    this.#argumentModified = false;
    this.#addresses = new Map<Node, StepInfo>();
    this.#evalOrder = evalOrder;
    const recorderVariableName = this.#transformation.generateUniqueName('arg');
    const types = nodeFactory(currentNode);
    const ident = types.identifier(recorderVariableName);
    const init = types.callExpression(
      types.memberExpression(this.#poweredAssertIdent, types.identifier('recorder')), [
        types.numericLiteral(this.#argNum)
      ]
    );
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    this.#transformation.insertDeclIntoCurrentBlock(decl);
    this.#argumentRecorderIdent = ident;
  }

  leave (controllerLike: ControllerLike, astPath: AstPath): Node {
    const { currentNode } = controllerLike;
    const shouldCaptureCurrentNode = toBeCaptured(controllerLike);
    if (shouldCaptureCurrentNode) {
      return this.#captureArgument(currentNode, astPath);
    } else if (this.isArgumentModified() && !shouldCaptureCurrentNode) {
      // argument is modified but return value is not to be captured
      return this.#wrapArgumentOnly(currentNode, astPath);
    } else {
      return currentNode;
    }
  }

  lastEvalOrder (): number {
    return this.#evalOrder;
  }

  isArgumentModified (): boolean {
    return !!this.#argumentModified;
  }

  isLeaving (node: Node): boolean {
    return this.#argNode === node;
  }

  captureNode (currentNode: Node, astPath: AstPath): CallExpression {
    return this.#insertRecorderNode(currentNode, astPath, 'tap', true);
  }

  #captureArgument (currentNode: Node, astPath: AstPath): CallExpression {
    return this.#insertRecorderNode(currentNode, astPath, 'rec', true);
  }

  #wrapArgumentOnly (currentNode: Node, astPath: AstPath): CallExpression {
    return this.#insertRecorderNode(currentNode, astPath, 'rec', false);
  }

  saveAddress (currentNode: Node): void {
    const address = this.#calculateAddress(currentNode);
    const stepInfo = {
      markerPos: address.markerPos,
      startPos: address.startPos,
      endPos: address.endPos,
      evalOrder: this.#evalOrder++
    };
    this.#addresses.set(currentNode, stepInfo);
  }

  #targetAddress (currentNode: Node): StepInfo | undefined {
    return this.#addresses.get(currentNode);
  }

  #calculateAddress (currentNode: Node): Address {
    const code = this.#assertionCode;
    if (this.#callexp.loc) {
      const offsetPosition = this.#callexp.loc.start;
      return searchAddress(currentNode, offsetPosition, code);
    } else {
      const offset = getStartRangeValue(this.#callexp);
      return searchAddress(currentNode, offset, code);
    }
  }

  #relativeAstPath (astPath: AstPath): AstPath {
    return astPath.slice(this.#assertionPath.length);
  }

  #insertRecorderNode (currentNode: Node, astPath: AstPath, methodName: string, capture: boolean): CallExpression {
    const relativeAstPath = this.#relativeAstPath(astPath);
    const types = nodeFactory(currentNode);
    const args = [
      currentNode
      // types.stringLiteral(relativeAstPath.join('/'))
    ];
    if (capture) {
      const stepInfo = this.#targetAddress(currentNode);
      assert(typeof stepInfo !== 'undefined', 'stepInfo must exist');
      args.push(types.numericLiteral(stepInfo.markerPos));
      args.push(types.numericLiteral(stepInfo.startPos));
      args.push(types.numericLiteral(stepInfo.endPos));
      args.push(types.numericLiteral(stepInfo.evalOrder));
    }
    const extraProps: ExtraProps = {};
    if (this.#binexp && (relativeAstPath.join('/') === 'arguments/0/left')) {
      extraProps.hint = 'left';
    }
    if (this.#binexp && (relativeAstPath.join('/') === 'arguments/0/right')) {
      extraProps.hint = 'right';
    }
    const propsNode = types.valueToNode(extraProps);
    assert(propsNode.type === 'ObjectExpression', 'propsNode must be an ObjectExpression');
    if (propsNode.properties.length > 0) {
      args.push(propsNode);
    }

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

  // readonly #assertionPath: (string | number)[];
  readonly #assertionPath: NodeKey[];
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

  constructor (currentNode: Node, astPath: AstPath, transformation: Transformation, decoratorFunctionIdent: Identifier, wholeCode: string) {
    this.#transformation = transformation;
    this.#decoratorFunctionIdent = decoratorFunctionIdent;
    this.#currentModification = null;
    this.#argumentModifications = [];
    // this.#assertionPath = ([] as (string | number)[]).concat(astPath);
    this.#assertionPath = ([] as NodeKey[]).concat(astPath);
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
    this.#poweredAssertIdent = this.#decorateAssert(currentNode);
  }

  leave (currentNode: Node): Node {
    try {
      return this.isModified() ? this.#replaceWithDecoratedAssert(currentNode) : currentNode;
    } finally {
      this.#argumentModifications.length = 0;
    }
  }

  isModified (): boolean {
    return this.#argumentModifications.some((am) => am.isArgumentModified());
  }

  #replaceWithDecoratedAssert (currentNode: Node): CallExpression {
    assert(currentNode.type === 'CallExpression', 'Node must be a CallExpression');
    const types = nodeFactory(currentNode);
    const replacedNode = types.callExpression(
      types.memberExpression(this.#poweredAssertIdent, types.identifier('run')), currentNode.arguments
    );
    return replacedNode;
  }

  #decorateAssert (currentNode: Node): Identifier {
    const transformation = this.#transformation;
    const types = nodeFactory(currentNode);
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
    transformation.insertDeclIntoCurrentBlock(decl);
    return ident;
  }

  enterArgument (node: Node): undefined {
    const currentNode = node;
    // going to capture every argument
    const argNum = this.#argumentModifications.length;
    const lastModification = this.#argumentModifications[argNum - 1];
    const starEvalOrder = lastModification ? lastModification.lastEvalOrder() : 0;
    const modification = new ArgumentModification({
      currentNode,
      argNum,
      argNode: currentNode,
      callexp: this.#callexp,
      assertionPath: this.#assertionPath,
      assertionCode: this.#assertionCode,
      transformation: this.#transformation,
      poweredAssertIdent: this.#poweredAssertIdent,
      evalOrder: starEvalOrder,
      binexp: this.#binexp
    });
    // modification.enter(controller);
    this.#argumentModifications.push(modification);
    this.#currentModification = modification;
    return undefined;
  }

  isLeavingArgument (node: Node): boolean {
    return !!this.#currentModification?.isLeaving(node);
  }

  leaveArgument (controllerLike: ControllerLike, astPath: AstPath): Node {
    assert(this.#currentModification, 'currentModification must exist');
    const retNode = this.#currentModification.leave(controllerLike, astPath);
    this.#currentModification = null;
    return retNode;
  }

  isCapturingArgument (): boolean {
    return !!this.#currentModification;
  }

  isNodeToBeSkipped (controllerLike: ControllerLike): boolean {
    const { currentNode } = controllerLike;
    if (currentNode === this.#calleeNode) {
      return true;
    }
    return toBeSkipped(controllerLike);
  }

  isNodeToBeCaptured (controllerLike: ControllerLike): boolean {
    return toBeCaptured(controllerLike);
  }

  leaveNodeToBeCaptured (currentNode: Node, astPath: AstPath): CallExpression {
    assert(this.#currentModification, 'currentModification must exist');
    return this.#currentModification.captureNode(currentNode, astPath);
  }

  enterNodeToBeCaptured (node: Node): void {
    assert(this.#currentModification, 'currentModification must exist');
    this.#currentModification.saveAddress(node);
  }
}
