// import { replace } from 'estraverse';
import { Transformation } from './transformation.mjs';
import { AssertionVisitor } from './assertion-visitor.mjs';
import { nodeFactory, isScoped } from './node-factory.mjs';
import { strict as assert } from 'node:assert';
// import type { Visitor, VisitorOption, Controller } from 'estraverse';
import { walk } from 'estree-walker';

import type {
  Node,
  Literal,
  SimpleLiteral,
  Identifier,
  MemberExpression,
  CallExpression,
  ImportDeclaration,
  ObjectPattern,
  SpreadElement
} from 'estree';
import type { Scoped } from './node-factory.mjs';
import type { SyncHandler } from 'estree-walker';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type KeyValue = { [key: string]: any };

type Visitor = {
  enter?: SyncHandler;
  leave?: SyncHandler;
};
type WalkerContext = {
  skip: () => void;
  remove: () => void;
  replace: (node: Node) => void;
};
type NodeKey = string | number | symbol | null | undefined;

export type TargetImportSpecifier = {
  source: string,
  imported: string[]
};

export type EspowerOptions = {
  runtime?: string,
  modules?: (string | TargetImportSpecifier)[],
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
function isSpreadElement (node: Node | null | undefined): node is SpreadElement {
  return !!node && node.type === 'SpreadElement';
}

function handleModuleSettings (modules?: (string | TargetImportSpecifier)[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  if (!modules) {
    return map;
  }
  for (const module of modules) {
    if (typeof module === 'string') {
      map.set(module, []);
    } else {
      const { source, imported } = module;
      map.set(source, imported);
    }
  }
  return map;
}

function createVisitor (ast: Node, options: EspowerOptions): Visitor {
  const config = Object.assign(defaultOptions(), options);
  const targetModules = handleModuleSettings(config.modules);
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
    const source = importDeclaration.source;
    if (!isStringLiteral(source)) {
      return;
    }
    const imports = targetModules.get(source.value);
    for (const specifier of importDeclaration.specifiers) {
      if (specifier.type === 'ImportSpecifier') {
        const imported = specifier.imported;
        if (!imports || imports.length === 0 || imports.includes(imported.name)) {
          registerIdentifierAsAssertionVariable(specifier.local);
        }
      } else if (specifier.type === 'ImportDefaultSpecifier' || specifier.type === 'ImportNamespaceSpecifier') {
        registerIdentifierAsAssertionVariable(specifier.local);
      }
    }
  }

  function registerAssertionVariables (node: Node) {
    if (isIdentifier(node)) {
      registerIdentifierAsAssertionVariable(node);
    } else if (isObjectPattern(node)) {
      handleDestructuredAssertionAssignment(node);
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

  function isCalleeOfParentCallExpression (parentNode: Node | null, currentKey: NodeKey): boolean {
    return !!parentNode && parentNode.type === 'CallExpression' && currentKey === 'callee';
  }

  const nodePathStack: NodeKey[] = [];
  const nodeToCapture = new WeakSet();
  const blockStack: Scoped[] = [];
  const transformation = new Transformation(blockStack);
  let decoratorFunctionIdent: Identifier | null = null;
  let assertionVisitor: AssertionVisitor | null = null;
  // let skipping = false;

  function popNodePathStackAndBlockStack (currentNode: Node, parentNode: Node | null, key: string | number | symbol | null | undefined, index: number | null | undefined): void {
    if (parentNode && index !== null && typeof key === 'string' && isLastChild(parentNode, key, index)) {
      nodePathStack.pop();
    }
    nodePathStack.pop();
    if (isScoped(currentNode)) {
      blockStack.pop();
    }
  }

  function applyTransformationIfMatched (walkerContext: WalkerContext, currentNode: Node) {
    if (transformation.isTarget(currentNode)) {
      // apply transformation to currentNode (Scope)
      transformation.apply(currentNode);
      // replace currentNode with transformed one
      walkerContext.replace(currentNode);
    }
  }

  // estree-walker MEMO: port leave-side logic here since leave() will not be called when skip() is called
  function skip (walkerContext: WalkerContext, currentNode: Node, parentNode: Node | null, key: string | number | symbol | null | undefined, index: number | null | undefined) {
    applyTransformationIfMatched(walkerContext, currentNode);
    popNodePathStackAndBlockStack(currentNode, parentNode, key, index);
    walkerContext.skip();
  }

  return {
    // enter: function (this: Controller, currentNode: Node, parentNode: Node | null): VisitorOption | Node | void {
    enter: function (this: WalkerContext, currentNode: Node, parentNode: Node | null, key: string | number | symbol | null | undefined, index: number | null | undefined): void {
      const currentKey = index !== null ? index : key;
      if (index !== null && index === 0) {
        // add prop key on entering first child
        nodePathStack.push(key);
      }
      nodePathStack.push(currentKey);
      // const controller = this; // eslint-disable-line @typescript-eslint/no-this-alias
      // const astPath = controller.path();
      const astPath = ([] as NodeKey[]).concat(nodePathStack);
      // const currentKey = astPath ? astPath[astPath.length - 1] : null;
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
          // skipping = true;
          // console.log(`##### skipping ${this.path().join('/')} #####`);
          // estree-walker MEMO: leave() will not be called when skip() is called
          skip(this, currentNode, parentNode, key, index);
          // this.skip();
          return;
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
            skip(this, currentNode, parentNode, key, index);
            // this.skip();
            // register local identifier(s) as assertion variable
            handleImportSpecifiers(currentNode);
            break;
          }
          case 'VariableDeclarator': {
            if (isEnhanceTargetRequire(currentNode.id, currentNode.init)) {
              skip(this, currentNode, parentNode, key, index);
              // this.skip();
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
              skip(this, currentNode, parentNode, key, index);
              // this.skip();
              // register local identifier(s) as assertion variable
              registerAssertionVariables(currentNode.left);
            }
            break;
          }
          case 'CallExpression': {
            const callee = currentNode.callee;
            if (isCaptureTargetAssertion(callee)) {
              // skip modifying argument if SpreadElement appears immediately beneath assert
              // assert(...args) looks like one argument syntactically, however there are two or more arguments actually.
              // power-assert works at the syntax level so it cannot handle SpreadElement that appears immediately beneath assert.
              if (currentNode.arguments.some(isSpreadElement)) {
                skip(this, currentNode, parentNode, key, index);
                break;
              }

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
    // leave: function (this: Controller, currentNode: Node, parentNode: Node | null): VisitorOption | Node | void {
    leave: function (this: WalkerContext, currentNode: Node, parentNode: Node | null, key: string | number | symbol | null | undefined, index: number | null | undefined): void {
      try {
        // const controller = this; // eslint-disable-line @typescript-eslint/no-this-alias
        // const astPath = controller.path();
        const astPath = ([] as NodeKey[]).concat(nodePathStack);
        // const currentKey = astPath ? astPath[astPath.length - 1] : null;
        const currentKey = index !== null ? index : key;
        const controllerLike = {
          currentNode,
          parentNode,
          currentKey
        };
        // const espath = path ? path.join('/') : '';
        // if (transformation.isTarget(espath, currentNode)) {
        if (transformation.isTarget(currentNode)) {
          // apply transformation to currentNode (Scope)
          transformation.apply(currentNode);
          // replace currentNode with transformed one
          this.replace(currentNode);
          return undefined;
        }
        if (!assertionVisitor) {
          return undefined;
        }
        // if (skipping) {
        //   skipping = false;
        //   return undefined;
        // }
        // console.log(`##### leave ${this.path().join('/')} #####`);
        if (nodeToCapture.has(currentNode)) {
          // leaving assertion
          // stop capturing
          // console.log(`##### leave assertion ${this.path().join('/')} #####`);
          const resultTree = assertionVisitor.leave(currentNode);
          assertionVisitor = null;
          // return resultTree;
          this.replace(resultTree);
          return;
        }
        if (!assertionVisitor.isCapturingArgument()) {
          return undefined;
        }
        if (assertionVisitor.isLeavingArgument(currentNode)) {
          // capturing whole argument on leaving argument
          assert(astPath !== null, 'astPath should not be null');
          // return assertionVisitor.leaveArgument(controllerLike, astPath);
          this.replace(assertionVisitor.leaveArgument(controllerLike, astPath));
          return;
        } else if (assertionVisitor.isNodeToBeCaptured(controllerLike)) {
          // capturing intermediate Node
          // console.log(`##### capture value ${this.path().join('/')} #####`);
          assert(astPath !== null, 'astPath should not be null');
          // return assertionVisitor.leaveNodeToBeCaptured(currentNode, astPath);
          this.replace(assertionVisitor.leaveNodeToBeCaptured(currentNode, astPath));
          return;
        }
        return undefined;
      } finally {
        popNodePathStackAndBlockStack(currentNode, parentNode, key, index);
      }
    }
  };
}

function isLastChild (parentNode: Node, currentKey: string, index: number | null | undefined): boolean {
  const parent = parentNode as KeyValue;
  return parent[currentKey].length - 1 === index;
}

function createPowerAssertImports ({ transformation, currentNode, runtime }: { transformation: Transformation, currentNode: Node, runtime: string }): Identifier {
  const types = nodeFactory(currentNode);
  const decoratorFunctionIdent = types.identifier('_power_');
  // TODO: CJS support?
  const decl = types.importDeclaration([
    types.importSpecifier(decoratorFunctionIdent)
  ], types.stringLiteral(runtime));
  transformation.insertDeclIntoTopLevel(decl);
  return decoratorFunctionIdent;
}

export function espowerAst (ast: Node, options: EspowerOptions): Node {
  const modifiedAst = walk(ast, createVisitor(ast, options));
  assert(modifiedAst !== null, 'modifiedAst should not be null');
  return modifiedAst;
  // return replace(ast, createVisitor(ast, options));
}

export type DefaultEspowerOptions = {
  runtime: string,
  modules?: (string | TargetImportSpecifier)[],
  variables?: string[]
};

export function defaultOptions (): DefaultEspowerOptions {
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
