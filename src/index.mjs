import { replace } from 'estraverse';
// import { Transformation } from './transformation.mjs';
// import { AssertionVisitor } from './assertion-visitor.mjs';
// import { analyze } from 'escope';
import { getParentNode, getCurrentKey } from './controller-utils.mjs';
// import { locationOf } from './location.mjs';
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
  let isCapturingArgument = false;
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
        if (!isCapturingArgument && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
        // if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
          // const loc = locationOf(currentNode, currentTokens);
          console.log(`##### entering argument ${this.path().join('/')} #####`);
          // entering argument
          isCapturingArgument = true;
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
              console.log(`##### start capturing ${this.path().join('/')} #####`);
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
        console.log(`##### leave ${this.path().join('/')} #####`);
        if (nodeToCapture.has(currentNode)) {
          // leaving assertion
          // stop capturing
          console.log(`##### stop capturing ${this.path().join('/')} #####`);
          const resultTree = assertionVisitor.leave(controller);
          assertionVisitor = null;
          return resultTree;
        }
        if (toBeCaptured(controller)) {
          console.log(`##### capture value ${this.path().join('/')} #####`);
        }
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
    this.canonicalCode = generateCanonicalCode(currentNode);
    console.log(`##### ${this.canonicalCode} #####`);
    const { expression, tokens } = parseCanonicalCode({
      content: this.canonicalCode,
      async: true,
      generator: false
    });
    this.canonicalAst = expression;
    this.canonicalTokens = tokens;
  }

  enterArgument (controller) {}
  leaveArgument (controller) {}
  leave (controller) {}
  isLeavingAssertion (controller) {}
  isLeavingArgument (controller) {}
  isCapturingArgument () {}

  isNodeToBeSkipped (controller) {
    const currentNode = controller.current();
    const parentNode = getParentNode(controller);
    const currentKey = getCurrentKey(controller);
    return toBeSkipped({ currentNode, parentNode, currentKey });
  }

  toBeCaptured (controller) {}
  captureNode (controller) {}
}
// class ArgumentModification {
//   enter (controller) {}
//   isCapturing () {}
//   leave (controller) {}
//   isMessageUpdated () {}
//   isArgumentModified () {}
//   isLeaving (controller) {}
//   captureNode (controller) {}
//   captureArgument (currentNode, path) {}
// }

// class ArgumentModification {
// }

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
