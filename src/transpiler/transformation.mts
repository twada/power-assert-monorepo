import {
  isScopedFunction,
  isArrowFunctionExpressionWithConciseBody
} from './create-node-with-loc.mjs';
import { strict as assert } from 'node:assert';
import type { Controller } from 'estraverse';
import type {
  ImportDeclaration,
  Statement,
  ModuleDeclaration,
  Directive,
  Node,
  VariableDeclaration
} from 'estree';
import type { Scoped } from './create-node-with-loc.mjs';

type MutationCallback = (matchNode: Scoped) => void;
type NameCounts = { [key: string]: number };
type Mutations = { [key: string]: MutationCallback[] };
type KeyValue = { [key: string]: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export class Transformation {
  readonly mutations: Mutations;
  readonly nameCounts: NameCounts;
  readonly blockStack: Scoped[];

  constructor (blockStack: Scoped[]) {
    this.mutations = {};
    this.nameCounts = {};
    this.blockStack = blockStack;
  }

  insertDeclIntoCurrentBlock (controller: Controller, decl: ImportDeclaration | VariableDeclaration): void {
    this._insertDecl(controller, decl, findBlockNode(this.blockStack));
  }

  insertDeclIntoTopLevel (controller: Controller, decl: ImportDeclaration | VariableDeclaration): void {
    this._insertDecl(controller, decl, this.blockStack[0]);
  }

  _insertDecl (controller: Controller, decl: ImportDeclaration | VariableDeclaration, block: Scoped): void {
    const scopeBlockEspath = findEspathOfTargetNode(block, controller);
    this._register(scopeBlockEspath, (matchNode: Scoped) => {
      let body: (Statement | ModuleDeclaration | Directive)[];
      if (isScopedFunction(matchNode)) {
        const blockStmt = matchNode.body;
        body = blockStmt.body;
      } else {
        body = matchNode.body;
      }
      insertAfterUseStrictDirective(decl, body);
    });
  }

  _register (espath: string, callback: MutationCallback): void {
    if (!this.mutations[espath]) {
      this.mutations[espath] = [];
    }
    this.mutations[espath].unshift(callback);
  }

  apply (espath: string, node: Scoped): void {
    this.mutations[espath].forEach((callback) => {
      callback(node);
    });
  }

  isTarget (espath: string, node: Node): node is Scoped {
    return !!this.mutations[espath];
  }

  generateUniqueName (name: string): string {
    if (!this.nameCounts[name]) {
      this.nameCounts[name] = 0;
    }
    this.nameCounts[name] += 1;
    return '_' + name + this.nameCounts[name];
  }
}

function findBlockNode (blockStack: Scoped[]): Scoped {
  const lastIndex = blockStack.length - 1;
  const blockNode = blockStack[lastIndex];
  if (!blockNode || isArrowFunctionExpressionWithConciseBody(blockNode)) {
    return findBlockNode(blockStack.slice(0, lastIndex));
  }
  return blockNode;
}

function findEspathOfTargetNode (targetNode: Node, controller: Controller): string {
  // iterate from child to root
  let child: Node | null = null;
  let parent: Node&KeyValue | null = null;
  const path = controller.path();
  assert(path !== null, 'path should not be null');
  const popUntilParent = (key: string | number | undefined) => {
    assert(parent !== null, 'parent should not be null');
    assert(key !== undefined, 'key should not be undefined');
    if (parent[key] !== undefined) {
      return;
    }
    popUntilParent(path.pop());
  };
  const parents = controller.parents();
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
  assert.fail('cannot be here');
}

function insertAfterUseStrictDirective (decl: ImportDeclaration | VariableDeclaration, body: (Statement | ModuleDeclaration | Directive)[]): void {
  const firstBody = body[0];
  if (firstBody.type === 'ExpressionStatement') {
    const expression = firstBody.expression;
    if (expression.type === 'Literal' && expression.value === 'use strict') {
      body.splice(1, 0, decl);
      return;
    }
  }
  body.unshift(decl);
}
