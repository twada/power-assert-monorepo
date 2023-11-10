import { strict as assert } from 'node:assert';
import type { Node } from 'estree';

type NodeKey = string | number | symbol | null | undefined;

const caputuringTargetTypes = new Set([
  'Literal',
  // 'Property',
  'ObjectExpression',
  'ArrayExpression',
  'ConditionalExpression',
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'UnaryExpression',
  'BinaryExpression',
  'LogicalExpression',
  'AssignmentExpression',
  'NewExpression',
  'UpdateExpression',
  'YieldExpression',
  'AwaitExpression',
  'TemplateLiteral',
  'TaggedTemplateExpression'
]);

const isCaputuringTargetNode = (currentNode: Node) => {
  return caputuringTargetTypes.has(currentNode.type);
};

const isCalleeOfCallExpression = (currentNode: Node, parentNode: Node, currentKey: NodeKey) => {
  return (parentNode.type === 'CallExpression' || parentNode.type === 'NewExpression') &&
    currentKey === 'callee' &&
    currentNode.type !== 'CallExpression';
};

const isChildOfTaggedTemplateExpression = (parentNode: Node) => {
  return parentNode.type === 'TaggedTemplateExpression';
};

const isYieldOrAwaitArgument = (parentNode: Node, currentKey: NodeKey) => {
  // capture the yielded/await result, not the promise
  return (parentNode.type === 'YieldExpression' || parentNode.type === 'AwaitExpression') && currentKey === 'argument';
};

const toBeCaptured = ({ currentNode, parentNode, currentKey }: {currentNode: Node, parentNode: Node | null, currentKey: NodeKey}) => {
  assert(parentNode, 'Parent node must exist');
  return isCaputuringTargetNode(currentNode) &&
        !isYieldOrAwaitArgument(parentNode, currentKey) &&
        !isCalleeOfCallExpression(currentNode, parentNode, currentKey) &&
        !isChildOfTaggedTemplateExpression(parentNode);
};

export {
  toBeCaptured
};