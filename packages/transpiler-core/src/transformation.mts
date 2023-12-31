import {
  isScopedFunction,
  isArrowFunctionExpressionWithConciseBody
} from './node-factory.mjs';
import { strict as assert } from 'node:assert';
import type {
  ImportDeclaration,
  Statement,
  ModuleDeclaration,
  Directive,
  Node,
  VariableDeclaration
} from 'estree';
import type { Scoped } from './node-factory.mjs';

type MutationCallback = (matchNode: Scoped) => void;
type NameCounts = { [key: string]: number };

export class Transformation {
  readonly #mutations: Map<Node, MutationCallback[]>;
  readonly #nameCounts: NameCounts;
  readonly #blockStack: Scoped[];

  constructor (blockStack: Scoped[]) {
    this.#mutations = new Map<Node, MutationCallback[]>();
    this.#nameCounts = {};
    this.#blockStack = blockStack;
  }

  insertDeclIntoCurrentBlock (decl: ImportDeclaration | VariableDeclaration): void {
    this.#insertDecl(decl, findBlockNode(this.#blockStack));
  }

  insertDeclIntoTopLevel (decl: ImportDeclaration | VariableDeclaration): void {
    this.#insertDecl(decl, this.#blockStack[0]);
  }

  #insertDecl (decl: ImportDeclaration | VariableDeclaration, block: Scoped): void {
    this.#register(block, (matchNode: Scoped) => {
      let body: (Statement | ModuleDeclaration | Directive)[];
      if (isScopedFunction(matchNode)) {
        const blockStmt = matchNode.body;
        body = blockStmt.body;
      } else {
        body = matchNode.body;
      }
      insertAfterDirectiveOrImportDeclaration(decl, body);
    });
  }

  #register (node: Node, callback: MutationCallback): void {
    if (!this.#mutations.has(node)) {
      this.#mutations.set(node, []);
    }
    const callbacks = this.#mutations.get(node);
    assert(callbacks !== undefined, 'callbacks should not be undefined');
    callbacks.unshift(callback);
  }

  apply (scope: Scoped): void {
    for (const callback of this.#mutations.get(scope) || []) {
      callback(scope);
    }
  }

  isTarget (node: Node): node is Scoped {
    return this.#mutations.has(node);
  }

  generateUniqueName (name: string): string {
    if (!this.#nameCounts[name]) {
      this.#nameCounts[name] = 0;
    }
    this.#nameCounts[name] += 1;
    return `_p${name}${this.#nameCounts[name]}`;
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

function isDirective (node: Node): node is Directive {
  return node.type === 'ExpressionStatement' && Object.hasOwn(node, 'directive');
}

function isImportDeclaration (node: Node): node is ImportDeclaration {
  return node.type === 'ImportDeclaration';
}

function insertAfterDirectiveOrImportDeclaration (decl: ImportDeclaration | VariableDeclaration, body: (Statement | ModuleDeclaration | Directive)[]): void {
  // find the first non-directive nor import declaration node then insert the decl before it
  const len = body.length;
  for (let i = 0; i < len; i += 1) {
    const node = body[i];
    if (!isDirective(node) && !isImportDeclaration(node)) {
      body.splice(i, 0, decl);
      return;
    }
  }
}
