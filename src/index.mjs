import { replace } from 'estraverse';
// import { Transformation } from './transformation.mjs';
// import { AssertionVisitor } from './assertion-visitor.mjs';
// import { analyze } from 'escope';
import { getParentNode, getCurrentKey } from './controller-utils.mjs';
import { locationOf } from './location.mjs';
import { generateCanonicalCode } from './generate-canonical-code.mjs';
import { parseCanonicalCode } from './parse-canonical-code.mjs';
import { toBeSkipped } from './rules/to-be-skipped.mjs';
import { toBeCaptured } from './rules/to-be-captured.mjs';

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

  let assertionVisitor;
  let skipping = false;

  return {
    enter: function (currentNode, parentNode) {
      const controller = this;
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

              // entering target assertion
              // start capturing
              assertionVisitor = new AssertionVisitor();
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
      const controller = this;
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
    }
  };
}

class AssertionVisitor {
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
  }

  enterArgument (controller) {
    const currentNode = controller.current();
    // going to capture every argument
    this.currentModification = new ArgumentModification({
      argNode: currentNode,
      calleeNode: this.calleeNode,
      assertionPath: this.assertionPath,
      canonicalAssertion: this.canonicalAssertion
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
  constructor ({ argNode, calleeNode, assertionPath, canonicalAssertion }) {
    this.argNode = argNode;
    this.calleeNode = calleeNode;
    this.assertionPath = assertionPath;
    this.canonicalAssertion = canonicalAssertion;
    this.argumentModified = false;
  }

  // var _ag4 = new _ArgumentRecorder1(assert.equal, _am3, 0);
  enter (controller) {}

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
    const relativeAstPath = this._relativeAstPath(controller);
    const { ast, tokens } = this.canonicalAssertion;
    const targetNodeInCanonicalAst = relativeAstPath.reduce((parent, key) => parent[key], ast);
    const targetRange = locationOf(targetNodeInCanonicalAst, tokens);

    const espath = relativeAstPath.join('/');
    console.log(`############# ag._tap(node, [${targetRange}], ${espath}) ############`);
    // return this.insertRecorder(controller.current(), controller.path(), '_tap');
  }

  _captureArgument (controller) {
    const espath = this._relativeAstPath(controller).join('/');
    // return this.insertRecorder(currentNode, path, '_rec');
    console.log(`############# ag._rec(node, ${espath}) ############`);
  }

  _relativeAstPath (controller) {
    const astPath = controller.path();
    return astPath.slice(this.assertionPath.length);
  }
}

// function insertRecorderNode (currentNode, path, methodName) {
//   const receiver = this.argumentRecorderIdent;
//   const types = new NodeCreator(currentNode);
//   const args = [
//     currentNode
//   ];
//   if (path) {
//     const relativeEsPath = path.slice(this.assertionPath.length);
//     args.push(types.valueToNode(relativeEsPath.join('/')));
//   }
//   const newNode = types.callExpression(
//     types.memberExpression(receiver, types.identifier(methodName)),
//     args
//   );
//   this.argumentModified = true;
//   return newNode;
// }

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
