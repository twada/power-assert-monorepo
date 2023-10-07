import { strict as assert } from 'node:assert';
import type { Node } from 'estree';

const caputuringTargetTypes = [
  'Literal',
  // 'Property',
  'ObjectExpression',
  'ArrayExpression',
  // 'ConditionalExpression',
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
];

const isCaputuringTargetType = (currentNode: Node) => {
  return caputuringTargetTypes.indexOf(currentNode.type) !== -1;
};

const isCalleeOfParent = (parentNode: Node, currentKey: string | number | null) => {
  return (parentNode.type === 'CallExpression' || parentNode.type === 'NewExpression') && currentKey === 'callee';
};

const isChildOfTaggedTemplateExpression = (parentNode: Node) => {
  return parentNode.type === 'TaggedTemplateExpression';
};

const isYieldOrAwaitArgument = (parentNode: Node, currentKey: string | number | null) => {
  // capture the yielded/await result, not the promise
  return (parentNode.type === 'YieldExpression' || parentNode.type === 'AwaitExpression') && currentKey === 'argument';
};

const toBeCaptured = (currentNode: Node, parentNode: Node | null, currentKey: string | number | null) => {
  assert(parentNode, 'Parent node must exist');
  return isCaputuringTargetType(currentNode) &&
        !isYieldOrAwaitArgument(parentNode, currentKey) &&
        !isCalleeOfParent(parentNode, currentKey) &&
        !isChildOfTaggedTemplateExpression(parentNode);
};

export {
  toBeCaptured
};
