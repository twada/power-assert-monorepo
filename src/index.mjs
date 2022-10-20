import { replace } from 'estraverse';
import { Transformation } from './transformation.mjs';
import { AssertionVisitor } from './assertion-visitor.mjs';
import { NodeCreator } from './create-node-with-loc.mjs';
import { getCurrentKey } from './controller-utils.mjs';

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
