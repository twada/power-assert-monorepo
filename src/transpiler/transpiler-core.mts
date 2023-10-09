import { replace } from 'estraverse';
import { Transformation } from './transformation.mjs';
import { AssertionVisitor } from './assertion-visitor.mjs';
import { NodeCreator, isScoped } from './create-node-with-loc.mjs';
import { strict as assert } from 'node:assert';
import type { Visitor, VisitorOption, Controller } from 'estraverse';
import type {
  Node,
  Literal,
  SimpleLiteral,
  Identifier,
  MemberExpression,
  CallExpression,
  ImportDeclaration,
  ObjectPattern
} from 'estree';
import type { Scoped } from './create-node-with-loc.mjs';

type EspowerOptions = {
  runtime?: string,
  modules?: string[],
  code: string,
  variables?: string[]
};

interface StringLiteral extends SimpleLiteral {
  type: 'Literal';
  value: string;
}

function isLiteral (node: Node | null | undefined): node is Literal {
  return !!node && node.type === 'Literal';
}
function isStringLiteral (node: Node | null | undefined): node is StringLiteral {
  return !!node && node.type === 'Literal' && typeof node.value === 'string';
}
function isIdentifier (node: Node | null | undefined): node is Identifier {
  return !!node && node.type === 'Identifier';
}
function isObjectPattern (node: Node | null | undefined): node is ObjectPattern {
  return !!node && node.type === 'ObjectPattern';
}
function isMemberExpression (node: Node | null | undefined): node is MemberExpression {
  return !!node && node.type === 'MemberExpression';
}
function isCallExpression (node: Node | null| undefined): node is CallExpression {
  return !!node && node.type === 'CallExpression';
}
function isImportDeclaration (node: Node | null | undefined): node is ImportDeclaration {
  return !!node && node.type === 'ImportDeclaration';
}

function createVisitor (ast: Node, options: EspowerOptions): Visitor {
  const config = Object.assign(defaultOptions(), options);
  const targetModules = new Set<string>(config.modules);
  const targetVariables = new Set<string>(config.variables);

  function isAssertionModuleName (lit: Node) {
    return isStringLiteral(lit) && targetModules.has(lit.value);
  }

  function isAssertionVariableName (id: Node) {
    return isIdentifier(id) && targetVariables.has(id.name);
  }

  function isAssertionMethod (callee: Node): boolean {
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

  function isAssertionFunction (callee: Node): boolean {
    return isAssertionVariableName(callee);
  }

  function registerIdentifierAsAssertionVariable (id: Node) {
    if (isIdentifier(id)) {
      targetVariables.add(id.name);
    }
  }

  function handleDestructuredAssertionAssignment (objectPattern: ObjectPattern) {
    for (const prop of objectPattern.properties) {
      switch (prop.type) {
        case 'Property': {
          registerIdentifierAsAssertionVariable(prop.value);
          break;
        }
        case 'RestElement': {
          registerIdentifierAsAssertionVariable(prop.argument);
          break;
        }
      }
    }
  }

  function handleImportSpecifiers (importDeclaration: ImportDeclaration) {
    for (const { local } of importDeclaration.specifiers) {
      registerIdentifierAsAssertionVariable(local);
    }
  }

  function registerAssertionVariables (node: Node) {
    if (isIdentifier(node)) {
      registerIdentifierAsAssertionVariable(node);
    } else if (isObjectPattern(node)) {
      handleDestructuredAssertionAssignment(node);
    } else if (isImportDeclaration(node)) {
      handleImportSpecifiers(node);
    }
  }

  function isRequireAssert (id: Node, init: Node | null | undefined): boolean {
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

  function isRequireAssertDotStrict (id: Node, init: Node | null | undefined): boolean {
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

  function isEnhanceTargetRequire (id: Node, init: Node | null | undefined): boolean {
    return isRequireAssert(id, init) || isRequireAssertDotStrict(id, init);
  }

  function isCaptureTargetAssertion (callee: Node): boolean {
    return isAssertionFunction(callee) || isAssertionMethod(callee);
  }

  function isCalleeOfParentCallExpression (parentNode: Node | null, currentKey: string | number | null): boolean {
    return !!parentNode && parentNode.type === 'CallExpression' && currentKey === 'callee';
  }

  const nodeToCapture = new WeakSet();
  const blockStack: Scoped[] = [];
  const transformation = new Transformation(blockStack);
  let decoratorFunctionIdent: Identifier | null = null;
  let assertionVisitor: AssertionVisitor | null = null;
  let skipping = false;

  return {
    enter: function (this: Controller, currentNode: Node, parentNode: Node | null): VisitorOption | Node | void {
      const controller = this; // eslint-disable-line @typescript-eslint/no-this-alias
      const astPath = controller.path();
      const currentKey = astPath ? astPath[astPath.length - 1] : null;
      const controllerLike = {
        currentNode,
        parentNode,
        currentKey
      };

      if (isScoped(currentNode)) {
        blockStack.push(currentNode);
      }

      if (assertionVisitor) {
        if (assertionVisitor.isNodeToBeSkipped(controllerLike)) {
          skipping = true;
          // console.log(`##### skipping ${this.path().join('/')} #####`);
          return controller.skip();
        }
        if (!assertionVisitor.isCapturingArgument() && !isCalleeOfParentCallExpression(parentNode, currentKey)) {
          // entering argument
          assertionVisitor.enterArgument(currentNode);
        }

        if (assertionVisitor.isCapturingArgument()) {
          if (assertionVisitor.isNodeToBeCaptured(controllerLike)) {
            // calculate location then save it
            assertionVisitor.enterNodeToBeCaptured(currentNode);
          }
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
              nodeToCapture.add(currentNode);

              const runtime = config.runtime;
              if (!decoratorFunctionIdent) {
                decoratorFunctionIdent = createPowerAssertImports({ transformation, currentNode, runtime });
              }

              // entering target assertion
              // start capturing
              assert(astPath !== null, 'astPath should not be null');
              assertionVisitor = new AssertionVisitor(currentNode, astPath, transformation, decoratorFunctionIdent, config.code);
              // assertionVisitor.enter(controller, config.code);
              // console.log(`##### enter assertion ${this.path().join('/')} #####`);
            }
            break;
          }
        }
      }
      return undefined;
    },
    leave: function (this: Controller, currentNode: Node, parentNode: Node | null): VisitorOption | Node | void {
      try {
        const controller = this; // eslint-disable-line @typescript-eslint/no-this-alias
        const astPath = controller.path();
        const currentKey = astPath ? astPath[astPath.length - 1] : null;
        const controllerLike = {
          currentNode,
          parentNode,
          currentKey
        };
        // const espath = path ? path.join('/') : '';
        // if (transformation.isTarget(espath, currentNode)) {
        if (transformation.isTarget(currentNode)) {
          transformation.apply(currentNode);
          return undefined;
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
          const resultTree = assertionVisitor.leave(currentNode);
          assertionVisitor = null;
          return resultTree;
        }
        if (!assertionVisitor.isCapturingArgument()) {
          return undefined;
        }
        if (assertionVisitor.isLeavingArgument(currentNode)) {
          // capturing whole argument on leaving argument
          assert(astPath !== null, 'astPath should not be null');
          return assertionVisitor.leaveArgument(controllerLike, astPath);
        } else if (assertionVisitor.isNodeToBeCaptured(controllerLike)) {
          // capturing intermediate Node
          // console.log(`##### capture value ${this.path().join('/')} #####`);
          assert(astPath !== null, 'astPath should not be null');
          return assertionVisitor.leaveNodeToBeCaptured(currentNode, astPath);
        }
        return undefined;
      } finally {
        if (isScoped(currentNode)) {
          blockStack.pop();
        }
      }
    }
  };
}

function createPowerAssertImports ({ transformation, currentNode, runtime }: { transformation: Transformation, currentNode: Node, runtime: string }): Identifier {
  const types = new NodeCreator(currentNode);
  const decoratorFunctionIdent = types.identifier('_power_');
  // TODO: CJS support?
  const decl = types.importDeclaration([
    types.importSpecifier(decoratorFunctionIdent)
  ], types.stringLiteral(runtime));
  transformation.insertDeclIntoTopLevel(decl);
  return decoratorFunctionIdent;
}

function espowerAst (ast: Node, options: EspowerOptions): Node {
  return replace(ast, createVisitor(ast, options));
}

function defaultOptions () {
  return {
    runtime: '@power-assert/runtime',
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
