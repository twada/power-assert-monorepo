import { replace } from 'estraverse';
import { Transformation } from './transformation.mjs';
// import { AssertionVisitor } from './assertion-visitor.mjs';
import { NodeCreator } from './create-node-with-loc.mjs';
import { getParentNode, getCurrentKey } from './controller-utils.mjs';
import { locationOf } from './location.mjs';
import { generateCanonicalCode } from './generate-canonical-code.mjs';
import { parseCanonicalCode } from './parse-canonical-code.mjs';
import { toBeSkipped } from './rules/to-be-skipped.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';
// import { createRequire } from 'node:module';
// const require = createRequire(import.meta.url);
// const pkg = require('../package.json');
// const recorderClassAst = require('./templates/argument-recorder.json');

function isLiteral (node) {
  return node && node.type === 'Literal';
}
function isIdentifier (node) {
  return node && node.type === 'Identifier';
}
function isObjectPattern (node) {
  return node && node.type === 'ObjectPattern';
}
function isMemberExpression (node) {
  return node && node.type === 'MemberExpression';
}
function isCallExpression (node) {
  return node && node.type === 'CallExpression';
}
function isImportDeclaration (node) {
  return node && node.type === 'ImportDeclaration';
}

function createVisitor (ast, options) {
  const config = Object.assign(defaultOptions(), options);
  const targetModules = new Set(config.modules);
  const targetVariables = new Set(config.variables);

  function isAssertionModuleName (lit) {
    return isLiteral(lit) && targetModules.has(lit.value);
  }

  function isAssertionVariableName (id) {
    return isIdentifier(id) && targetVariables.has(id.name);
  }

  function isAssertionMethod (callee) {
    if (!isMemberExpression(callee)) {
      return false;
    }
    const obj = callee.object;
    if (isMemberExpression(obj)) {
      return isAssertionMethod(obj);
    } else {
      return isAssertionVariableName(obj);
    }
  }

  function isAssertionFunction (callee) {
    return isAssertionVariableName(callee);
  }

  function registerIdentifierAsAssertionVariable (id) {
    if (isIdentifier(id)) {
      targetVariables.add(id.name);
    }
  }

  function handleDestructuredAssertionAssignment (objectPattern) {
    for (const { value } of objectPattern.properties) {
      registerIdentifierAsAssertionVariable(value);
    }
  }

  function handleImportSpecifiers (importDeclaration) {
    for (const { local } of importDeclaration.specifiers) {
      registerIdentifierAsAssertionVariable(local);
    }
  }

  function registerAssertionVariables (node) {
    if (isIdentifier(node)) {
      registerIdentifierAsAssertionVariable(node);
    } else if (isObjectPattern(node)) {
      handleDestructuredAssertionAssignment(node);
    } else if (isImportDeclaration(node)) {
      handleImportSpecifiers(node);
    }
  }

  function isRequireAssert (id, init) {
    if (!isCallExpression(init)) {
      return false;
    }
    const callee = init.callee;
    if (!isIdentifier(callee) || callee.name !== 'require') {
      return false;
    }
    const arg = init.arguments[0];
    if (!isLiteral(arg) || !isAssertionModuleName(arg)) {
      return false;
    }
    return isIdentifier(id) || isObjectPattern(id);
  }

  function isRequireAssertDotStrict (id, init) {
    if (!isMemberExpression(init)) {
      return false;
    }
    if (!isRequireAssert(id, init.object)) {
      return false;
    }
    const prop = init.property;
    if (!isIdentifier(prop)) {
      return false;
    }
    return prop.name === 'strict';
  }

  function isEnhanceTargetRequire (id, init) {
    return isRequireAssert(id, init) || isRequireAssertDotStrict(id, init);
  }

  function isCaptureTargetAssertion (callee) {
    return isAssertionFunction(callee) || isAssertionMethod(callee);
  }

  function isCalleeOfParentCallExpression (parentNode, currentKey) {
    return parentNode.type === 'CallExpression' && currentKey === 'callee';
  }

  const nodeToCapture = new WeakSet();
  const blockStack = [];
  const transformation = new Transformation(blockStack);
  let isPowerAssertImported = false;
  let decoratorFunctionIdent;

  let assertionVisitor;
  let skipping = false;

  return {
    enter: function (currentNode, parentNode) {
      const controller = this;

      if (/^Program$|Block$|Function/.test(currentNode.type)) {
        blockStack.push(currentNode);
      }

      if (assertionVisitor) {
        if (assertionVisitor.isNodeToBeSkipped(controller)) {
          skipping = true;
          // console.log(`##### skipping ${this.path().join('/')} #####`);
          return controller.skip();
        }
        const currentKey = getCurrentKey(controller);
        if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
          // entering argument
          assertionVisitor.enterArgument(controller);
        }
      } else {
        switch (currentNode.type) {
          case 'ImportDeclaration': {
            const source = currentNode.source;
            if (!(isAssertionModuleName(source))) {
              return undefined;
            }
            this.skip();
            // register local identifier(s) as assertion variable
            registerAssertionVariables(currentNode);
            break;
          }
          case 'VariableDeclarator': {
            if (isEnhanceTargetRequire(currentNode.id, currentNode.init)) {
              this.skip();
              // register local identifier(s) as assertion variable
              registerAssertionVariables(currentNode.id);
            }
            break;
          }
          case 'AssignmentExpression': {
            if (currentNode.operator !== '=') {
              return undefined;
            }
            if (isEnhanceTargetRequire(currentNode.left, currentNode.right)) {
              this.skip();
              // register local identifier(s) as assertion variable
              registerAssertionVariables(currentNode.left);
            }
            break;
          }
          case 'CallExpression': {
            const callee = currentNode.callee;
            if (isCaptureTargetAssertion(callee)) {
              // capture parent ExpressionStatement
              nodeToCapture.add(currentNode);

              if (!isPowerAssertImported) {
                isPowerAssertImported = true;
                const globalScopeBlock = blockStack[0];
                decoratorFunctionIdent = createPowerAssertImports({ transformation, globalScopeBlock, controller });
              }

              // entering target assertion
              // start capturing
              const wholeCode = config.code;
              assertionVisitor = new AssertionVisitor({ transformation, decoratorFunctionIdent, wholeCode });
              assertionVisitor.enter(controller);
              // console.log(`##### enter assertion ${this.path().join('/')} #####`);
            }
            break;
          }
        }
      }
      return undefined;
    },
    leave: function (currentNode, parentNode) {
      try {
        const controller = this;
        const path = controller.path();
        const espath = path ? path.join('/') : '';
        if (transformation.isTarget(espath)) {
          const targetNode = currentNode;
          transformation.apply(espath, targetNode);
          return targetNode;
        }
        if (!assertionVisitor) {
          return undefined;
        }
        if (skipping) {
          skipping = false;
          return undefined;
        }
        // console.log(`##### leave ${this.path().join('/')} #####`);
        if (nodeToCapture.has(currentNode)) {
          // leaving assertion
          // stop capturing
          // console.log(`##### leave assertion ${this.path().join('/')} #####`);
          const resultTree = assertionVisitor.leave(controller);
          assertionVisitor = null;
          return resultTree;
        }
        if (!assertionVisitor.isCapturingArgument()) {
          return undefined;
        }
        if (assertionVisitor.isLeavingArgument(controller)) {
          // capturing whole argument on leaving argument
          return assertionVisitor.leaveArgument(controller);
        } else if (assertionVisitor.toBeCaptured(controller)) {
          // capturing intermediate Node
          // console.log(`##### capture value ${this.path().join('/')} #####`);
          return assertionVisitor.captureNode(controller);
        }
        return undefined;
      } finally {
        if (/^Program$|Block$|Function/.test(currentNode.type)) {
          blockStack.pop();
        }
      }
    }
  };
}

function createPowerAssertImports ({ transformation, globalScopeBlock, controller }) {
  const globalScopeBlockEspath = findEspathOfAncestorNode(globalScopeBlock, controller);
  const types = new NodeCreator(globalScopeBlock);
  const decoratorFunctionIdent = types.identifier('_power_');
  const decl = types.importDeclaration([
    types.importSpecifier(decoratorFunctionIdent)
  ], types.stringLiteral('./runtime.mjs'));
  transformation.register(globalScopeBlockEspath, (matchNode) => {
    insertAfterUseStrictDirective(decl, matchNode.body);
  });
  return decoratorFunctionIdent;
}

const findEspathOfAncestorNode = (targetNode, controller) => {
  // iterate child to root
  let child, parent;
  const path = controller.path();
  const parents = controller.parents();
  const popUntilParent = (key) => {
    if (parent[key] !== undefined) {
      return;
    }
    popUntilParent(path.pop());
  };
  for (let i = parents.length - 1; i >= 0; i--) {
    parent = parents[i];
    if (child) {
      popUntilParent(path.pop());
    }
    if (parent === targetNode) {
      return path.join('/');
    }
    child = parent;
  }
  return null;
};

const insertAfterUseStrictDirective = (decl, body) => {
  const firstBody = body[0];
  if (firstBody.type === 'ExpressionStatement') {
    const expression = firstBody.expression;
    if (expression.type === 'Literal' && expression.value === 'use strict') {
      body.splice(1, 0, decl);
      return;
    }
  }
  body.unshift(decl);
};

const findBlockNode = (blockStack) => {
  const lastIndex = blockStack.length - 1;
  const blockNode = blockStack[lastIndex];
  if (!blockNode || isArrowFunctionWithConciseBody(blockNode)) {
    return findBlockNode(blockStack.slice(0, lastIndex));
  }
  return blockNode;
};

const isArrowFunctionWithConciseBody = (node) => {
  return node.type === 'ArrowFunctionExpression' && node.body.type !== 'BlockStatement';
};

class AssertionVisitor {
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
    const modifiedSome = this.argumentModifications.some((am) => am.isArgumentModified());
    try {
      return modifiedSome ? this._replaceWithDecoratedAssert(controller) : controller.current();
    } finally {
      this.argumentModifications = [];
    }
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
    return this.currentModification.isLeaving(controller);
  }

  leaveArgument (controller) {
    const retNode = this.currentModification.leave(controller);
    this.currentModification = null;
    return retNode;
  }

  isCapturingArgument () {
    return this.currentModification;
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

function espowerAst (ast, options) {
  return replace(ast, createVisitor(ast, options));
}

function defaultOptions () {
  return {
    modules: [
      'assert',
      'assert/strict',
      'node:assert',
      'node:assert/strict'
    ]
  };
}

export {
  AssertionVisitor,
  espowerAst,
  defaultOptions
};
