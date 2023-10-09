import {
  isScopedFunction,
  isArrowFunctionExpressionWithConciseBody
} from './create-node-with-loc.mjs';
import { strict as assert } from 'node:assert';
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
      insertAfterDirective(decl, body);
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

// function findEspathOfTargetNode (targetNode: Node, controller: Controller): string {
//   // iterate from child to root
//   let child: Node | null = null;
//   let parent: Node&KeyValue | null = null;
//   const path = controller.path();
//   assert(path !== null, 'path should not be null');
//   const popUntilParent = (key: string | number | undefined) => {
//     assert(parent !== null, 'parent should not be null');
//     assert(key !== undefined, 'key should not be undefined');
//     if (parent[key] !== undefined) {
//       return;
//     }
//     popUntilParent(path.pop());
//   };
//   const parents = controller.parents();
//   for (let i = parents.length - 1; i >= 0; i--) {
//     parent = parents[i];
//     if (child) {
//       popUntilParent(path.pop());
//     }
//     if (parent === targetNode) {
//       return path.join('/');
//     }
//     child = parent;
//   }
//   assert.fail('cannot be here');
// }

function isDirective (node: Node): node is Directive {
  return node.type === 'ExpressionStatement' && Object.hasOwn(node, 'directive');
}

function insertAfterDirective (decl: ImportDeclaration | VariableDeclaration, body: (Statement | ModuleDeclaration | Directive)[]): void {
  const firstBody = body[0];
  if (isDirective(firstBody)) {
    body.splice(1, 0, decl);
    return;
  }
  body.unshift(decl);
}
