import { replace } from 'estraverse';
// import { Transformation } from './transformation.mjs';
// import { AssertionVisitor } from './assertion-visitor.mjs';
// import { analyze } from 'escope';
// import { getCurrentKey } from './controller-utils.mjs';
// import { locationOf } from './location.mjs';
// import { generate, Precedence } from 'escodegen';
import { generateCanonicalCode } from './generate-canonical-code.mjs';
import { parseCanonicalCode } from './parse-canonical-code.mjs';

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

  // function isCalleeOfParentCallExpression (parentNode, currentKey) {
  //   return parentNode.type === 'CallExpression' && currentKey === 'callee';
  // }

  const nodeToEnhance = new WeakSet();
  const nodeToCapture = new WeakSet();

  return {
    enter: function (currentNode, parentNode) {
      switch (currentNode.type) {
        case 'ImportDeclaration': {
          const source = currentNode.source;
          if (!(isAssertionModuleName(source))) {
            return;
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
            return;
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
            const canonicalCode = generateCanonicalCode(currentNode);
            console.log(`##### ${canonicalCode} #####`);
            const { expression, tokens } = parseCanonicalCode({
              content: canonicalCode,
              async: true,
              generator: false
            });
            console.log(expression);
            console.log(tokens);

            // start capturing
          }
          break;
        }
      }
    },
    leave: function (currentNode, parentNode) {
      if (nodeToEnhance.has(currentNode)) {
        // node:assert -> power-assert
        if (currentNode.type === 'ImportDeclaration') {
          const lit = currentNode.source;
          lit.value = 'power-assert';
          return currentNode;
        }
      }
      if (nodeToCapture.has(currentNode)) {
        // leaving assertion
      }
      return undefined;
    }
  };
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
