import { getParentNode, getCurrentKey } from './controller-utils.mjs';
import { NodeCreator } from './create-node-with-loc.mjs';
import { locationOf } from './location.mjs';
import { generateCanonicalCode } from './generate-canonical-code.mjs';
import { parseCanonicalCode } from './parse-canonical-code.mjs';
import { toBeSkipped } from './rules/to-be-skipped.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';

function isMemberExpression (node) {
  return node && node.type === 'MemberExpression';
}

export class AssertionVisitor {
  constructor ({ transformation, decoratorFunctionIdent, wholeCode }) {
    this.transformation = transformation;
    this.decoratorFunctionIdent = decoratorFunctionIdent;
    this.wholeCode = wholeCode;
    this.currentModification = null;
    this.argumentModifications = [];
  }

  enter (controller) {
    this.assertionPath = [].concat(controller.path());
    const currentNode = controller.current();
    this.calleeNode = currentNode.callee;
    const canonicalCode = generateCanonicalCode(currentNode);
    // console.log(`##### ${canonicalCode} #####`);
    const { expression, tokens } = parseCanonicalCode({
      content: canonicalCode,
      async: true,
      generator: false
    });
    this.canonicalAssertion = {
      // canonical code
      code: canonicalCode,
      // ast with canonical ranges
      ast: expression,
      // tokens with canonical ranges
      tokens: tokens
    };

    this.poweredAssertIdent = this._decorateAssert(controller);
    const [start, end] = currentNode.range;
    this.assertionCode = this.wholeCode.slice(start, end);
  }

  leave (controller) {
    try {
      return this.isModified() ? this._replaceWithDecoratedAssert(controller) : controller.current();
    } finally {
      this.argumentModifications = [];
    }
  }

  isModified () {
    return this.argumentModifications.some((am) => am.isArgumentModified());
  }

  _replaceWithDecoratedAssert (controller) {
    const currentNode = controller.current();
    const types = new NodeCreator(currentNode);
    const replacedNode = types.callExpression(
      types.memberExpression(this.poweredAssertIdent, types.identifier('run')), currentNode.arguments
    );
    return replacedNode;
  }

  _decorateAssert (controller) {
    const currentNode = controller.current();
    const transformation = this.transformation;
    const types = new NodeCreator(currentNode);
    const props = {};
    if (this.withinAsync) {
      props.async = true;
    }
    if (this.withinGenerator) {
      props.generator = true;
    }
    const propsNode = types.valueToNode(props);

    const callee = this.calleeNode;
    const receiver = isMemberExpression(this.calleeNode) ? this.calleeNode.object : types.nullLiteral();
    const args = [
      callee,
      receiver,
      types.valueToNode(this.canonicalAssertion.code)
    ];
    if (propsNode.properties.length > 0) {
      args.push(propsNode);
    }
    const init = types.callExpression(this.decoratorFunctionIdent, args);
    const varName = transformation.generateUniqueName('asrt');
    const ident = types.identifier(varName);
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    transformation.insertDecl(controller, decl);
    return ident;
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    // going to capture every argument
    const argNum = this.argumentModifications.length;
    const modification = new ArgumentModification({
      argNum: argNum,
      argNode: currentNode,
      calleeNode: this.calleeNode,
      assertionPath: this.assertionPath,
      canonicalAssertion: this.canonicalAssertion,
      transformation: this.transformation,
      poweredAssertIdent: this.poweredAssertIdent,
      blockStack: this.blockStack
    });
    modification.enter(controller);
    this.argumentModifications.push(modification);
    this.currentModification = modification;
    return undefined;
  }

  isLeavingArgument (controller) {
    return this.currentModification?.isLeaving(controller);
  }

  leaveArgument (controller) {
    const retNode = this.currentModification.leave(controller);
    this.currentModification = null;
    return retNode;
  }

  isCapturingArgument () {
    return !!this.currentModification;
  }

  isNodeToBeSkipped (controller) {
    const currentNode = controller.current();
    if (currentNode === this.calleeNode) {
      return true;
    }
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return toBeSkipped({ currentNode, parentNode, currentKey });
  }

  toBeCaptured (controller) {
    return toBeCaptured(controller);
  }

  captureNode (controller) {
    return this.currentModification.captureNode(controller);
  }
}

class ArgumentModification {
  constructor ({ argNum, argNode, calleeNode, assertionPath, canonicalAssertion, transformation, poweredAssertIdent, blockStack }) {
    this.argNum = argNum;
    this.argNode = argNode;
    this.calleeNode = calleeNode;
    this.assertionPath = assertionPath;
    this.canonicalAssertion = canonicalAssertion;
    this.transformation = transformation;
    this.poweredAssertIdent = poweredAssertIdent;
    this.blockStack = blockStack;
    this.argumentModified = false;
  }

  // var _ag4 = new _ArgumentRecorder1(assert.equal, _am3, 0);
  enter (controller) {
    const recorderVariableName = this.transformation.generateUniqueName('arg');
    const currentNode = controller.current();
    const types = new NodeCreator(currentNode);
    const ident = types.identifier(recorderVariableName);
    const init = types.callExpression(
      types.memberExpression(this.poweredAssertIdent, types.identifier('newArgumentRecorder')), [
        types.numericLiteral(this.argNum)
      ]
    );
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    this.transformation.insertDecl(controller, decl);
    this.argumentRecorderIdent = ident;
  }

  leave (controller) {
    const currentNode = controller.current();
    const shouldCaptureValue = toBeCaptured(controller);
    // const pathToBeCaptured = shouldCaptureValue ? controller.path() : null;
    const shouldCaptureArgument = this.isArgumentModified() || shouldCaptureValue;
    const resultNode = shouldCaptureArgument ? this._captureArgument(controller) : currentNode;
    return resultNode;
  }

  isArgumentModified () {
    return !!this.argumentModified;
  }

  isLeaving (controller) {
    return this.argNode === controller.current();
  }

  captureNode (controller) {
    return this._insertRecorderNode(controller, '_tap');
  }

  _captureArgument (controller) {
    return this._insertRecorderNode(controller, '_rec');
  }

  _targetRange (controller) {
    const relativeAstPath = this._relativeAstPath(controller);
    const { ast, tokens } = this.canonicalAssertion;
    const targetNodeInCanonicalAst = relativeAstPath.reduce((parent, key) => parent[key], ast);
    const targetRange = locationOf(targetNodeInCanonicalAst, tokens);
    return targetRange;
  }

  _relativeAstPath (controller) {
    const astPath = controller.path();
    return astPath.slice(this.assertionPath.length);
  }

  _insertRecorderNode (controller, methodName) {
    const currentNode = controller.current();
    const relativeAstPath = this._relativeAstPath(controller);
    const targetRange = this._targetRange(controller);

    const types = new NodeCreator(currentNode);
    const args = [
      currentNode,
      types.valueToNode(relativeAstPath.join('/')),
      types.valueToNode(targetRange[0])
      // types.valueToNode(targetRange[1])
    ];

    const receiver = this.argumentRecorderIdent;
    const newNode = types.callExpression(
      types.memberExpression(receiver, types.identifier(methodName)),
      args
    );
    this.argumentModified = true;
    return newNode;
  }
}
