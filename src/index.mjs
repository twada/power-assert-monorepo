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

  const nodeToEnhance = new WeakSet();
  const nodeToCapture = new WeakSet();
  const transformation = new Transformation();
  const blockStack = [];
  let isPowerAssertImported = false;
  let argumentRecorderClassIdent;
  let metadataFunctionIdent;
  let poweredDecoratorIdent;

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
          console.log(`##### skipping ${this.path().join('/')} #####`);
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
            // enhance current ImportDeclaration
            nodeToEnhance.add(currentNode);
            this.skip();
            // register local identifier(s) as assertion variable
            registerAssertionVariables(currentNode);
            break;
          }
          case 'VariableDeclarator': {
            if (isEnhanceTargetRequire(currentNode.id, currentNode.init)) {
              // enhance current VariableDeclarator
              nodeToEnhance.add(currentNode);
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
              // enhance current AssignmentExpression
              nodeToEnhance.add(currentNode);
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
                const idents = createPowerAssertImports({ transformation, globalScopeBlock, controller });
                argumentRecorderClassIdent = idents.argumentRecorderClassIdent;
                metadataFunctionIdent = idents.metadataFunctionIdent;
                poweredDecoratorIdent = idents.poweredDecoratorIdent;
              }

              // if (!argumentRecorderClassIdent) {
              //   const globalScopeBlock = blockStack[0];
              //   argumentRecorderClassIdent = createArgumentRecorder({ transformation, globalScopeBlock, controller });
              // }
              // if (!metadataFunctionIdent) {
              //   const globalScopeBlock = blockStack[0];
              //   metadataFunctionIdent = createMetadataFunction({ transformation, globalScopeBlock, controller });
              // }

              // entering target assertion
              // start capturing
              assertionVisitor = new AssertionVisitor({ transformation, argumentRecorderClassIdent, metadataFunctionIdent, blockStack });
              assertionVisitor.enter(controller);
              console.log(`##### enter assertion ${this.path().join('/')} #####`);
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
        if (assertionVisitor) {
          if (skipping) {
            skipping = false;
            return undefined;
          }
          // console.log(`##### leave ${this.path().join('/')} #####`);
          if (nodeToCapture.has(currentNode)) {
            // leaving assertion
            // stop capturing
            console.log(`##### leave assertion ${this.path().join('/')} #####`);
            // const resultTree = assertionVisitor.leave(controller);
            assertionVisitor = null;
            // return resultTree;
            return undefined;
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
        } else {
          if (nodeToEnhance.has(currentNode)) {
            // node:assert -> power-assert
            if (currentNode.type === 'ImportDeclaration') {
              const lit = currentNode.source;
              lit.value = 'power-assert';
              return currentNode;
            }
          }
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
  const argumentRecorderClassIdent = types.identifier('ArgumentRecorder');
  const metadataFunctionIdent = types.identifier('_pwmeta');
  const poweredDecoratorIdent = types.identifier('power');
  const decl = types.importDeclaration([
    types.importSpecifier(argumentRecorderClassIdent),
    types.importSpecifier(metadataFunctionIdent),
    types.importSpecifier(poweredDecoratorIdent)
  ], types.stringLiteral('./runtime.mjs'));
  transformation.register(globalScopeBlockEspath, (matchNode) => {
    insertAfterUseStrictDirective(decl, matchNode.body);
  });
  return {
    argumentRecorderClassIdent,
    metadataFunctionIdent,
    poweredDecoratorIdent
  };
}

// function createMetadataFunction ({ transformation, globalScopeBlock, controller }) {
//   const globalScopeBlockEspath = findEspathOfAncestorNode(globalScopeBlock, controller);
//   const types = new NodeCreator(globalScopeBlock);
//   const contentIdent = types.identifier('content');
//   const extraIdent = types.identifier('extra');
//   const transpilerIdent = types.identifier('transpiler');
//   const versionIdent = types.identifier('version');
//   const objectAssignMethod = types.memberExpression(types.identifier('Object'), types.identifier('assign'));
//   const funcNode = types.arrowFunctionExpression([
//     contentIdent,
//     extraIdent
//   ], types.blockStatement([
//     types.returnStatement(types.callExpression(objectAssignMethod, [
//       types.objectExpression([
//         types.objectProperty(transpilerIdent, types.valueToNode(pkg.name), false, false),
//         types.objectProperty(versionIdent, types.valueToNode(pkg.version), false, false),
//         types.objectProperty(contentIdent, contentIdent, false, true)
//       ]),
//       extraIdent
//     ]))
//   ]));
//   const ident = types.identifier('_pwmeta');
//   const decl = types.variableDeclaration('const', [
//     types.variableDeclarator(ident, funcNode)
//   ]);
//   transformation.register(globalScopeBlockEspath, (matchNode) => {
//     insertAfterUseStrictDirective(decl, matchNode.body);
//   });
//   return ident;
// }

// function createArgumentRecorder ({ transformation, globalScopeBlock, controller }) {
//   const globalScopeBlockEspath = findEspathOfAncestorNode(globalScopeBlock, controller);
//   const idName = 'ArgumentRecorder1';
//   const init = recorderClassAst;
//   const types = new NodeCreator(globalScopeBlock);
//   const ident = types.identifier(idName);
//   const decl = types.variableDeclaration('const', [
//     types.variableDeclarator(ident, init)
//   ]);
//   transformation.register(globalScopeBlockEspath, (matchNode) => {
//     insertAfterUseStrictDirective(decl, matchNode.body);
//   });
//   return ident;
// }

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
  constructor ({ transformation, argumentRecorderClassIdent, metadataFunctionIdent, blockStack }) {
    this.transformation = transformation;
    this.argumentRecorderClassIdent = argumentRecorderClassIdent;
    this.metadataFunctionIdent = metadataFunctionIdent;
    this.blockStack = blockStack;
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
    // generate assertion level metadata
    this.assertionMetadataIdent = this.generateMetadata(controller);
  }

  generateMetadata (controller) {
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
    const args = [
      types.valueToNode(this.canonicalAssertion.code)
    ];
    if (propsNode.properties.length > 0) {
      args.push(propsNode);
    }
    const init = types.callExpression(this.metadataFunctionIdent, args);
    const varName = transformation.generateUniqueName('am');
    const ident = types.identifier(varName);
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);

    const currentBlock = findBlockNode(this.blockStack);
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
    transformation.register(scopeBlockEspath, (matchNode) => {
      let body;
      if (/Function/.test(matchNode.type)) {
        const blockStatement = matchNode.body;
        body = blockStatement.body;
      } else {
        body = matchNode.body;
      }
      insertAfterUseStrictDirective(decl, body);
    });
    return ident;
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    // going to capture every argument
    this.currentModification = new ArgumentModification({
      argNode: currentNode,
      calleeNode: this.calleeNode,
      assertionPath: this.assertionPath,
      canonicalAssertion: this.canonicalAssertion,
      transformation: this.transformation,
      argumentRecorderClassIdent: this.argumentRecorderClassIdent,
      assertionMetadataIdent: this.assertionMetadataIdent,
      blockStack: this.blockStack
    });
    this.currentModification.enter(controller);
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
  constructor ({ argNode, calleeNode, assertionPath, canonicalAssertion, transformation, argumentRecorderClassIdent, assertionMetadataIdent, blockStack }) {
    this.argNode = argNode;
    this.calleeNode = calleeNode;
    this.assertionPath = assertionPath;
    this.canonicalAssertion = canonicalAssertion;
    this.transformation = transformation;
    this.argumentRecorderClassIdent = argumentRecorderClassIdent;
    this.assertionMetadataIdent = assertionMetadataIdent;
    this.blockStack = blockStack;
    this.argumentModified = false;
  }

  // var _ag4 = new _ArgumentRecorder1(assert.equal, _am3, 0);
  enter (controller) {
    const currentBlock = findBlockNode(this.blockStack);
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);

    const recorderVariableName = this.transformation.generateUniqueName('arg');
    const currentNode = controller.current();
    const types = new NodeCreator(currentNode);
    const ident = types.identifier(recorderVariableName);
    const init = types.newExpression(this.argumentRecorderClassIdent, [
      this.calleeNode,
      this.assertionMetadataIdent
    ]);
    const decl = types.variableDeclaration('const', [
      types.variableDeclarator(ident, init)
    ]);
    this.transformation.register(scopeBlockEspath, (matchNode) => {
      let body;
      if (/Function/.test(matchNode.type)) {
        const blockStatement = matchNode.body;
        body = blockStatement.body;
      } else {
        body = matchNode.body;
      }
      insertAfterUseStrictDirective(decl, body);
    });
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
  espowerAst,
  defaultOptions
};
