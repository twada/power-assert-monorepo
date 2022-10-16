export class Transformation {
  constructor (blockStack) {
    this.mutations = {};
    this.nameCounts = {};
    this.blockStack = blockStack;
  }

  insertDecl (controller, decl) {
    const currentBlock = findBlockNode(this.blockStack);
    const scopeBlockEspath = findEspathOfAncestorNode(currentBlock, controller);
    this.register(scopeBlockEspath, (matchNode) => {
      let body;
      if (/Function/.test(matchNode.type)) {
        const blockStatement = matchNode.body;
        body = blockStatement.body;
      } else {
        body = matchNode.body;
      }
      insertAfterUseStrictDirective(decl, body);
    });
  }

  register (espath, callback) {
    if (!this.mutations[espath]) {
      this.mutations[espath] = [];
    }
    this.mutations[espath].unshift(callback);
  }

  apply (espath, node) {
    this.mutations[espath].forEach((callback) => {
      callback(node);
    });
  }

  isTarget (espath) {
    return !!this.mutations[espath];
  }

  generateUniqueName (name) {
    if (!this.nameCounts[name]) {
      this.nameCounts[name] = 0;
    }
    this.nameCounts[name] += 1;
    return '_' + name + this.nameCounts[name];
  }
}

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
