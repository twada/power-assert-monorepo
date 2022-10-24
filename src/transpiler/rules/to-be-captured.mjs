import { getParentNode, getCurrentKey } from '../controller-utils.mjs';
const caputuringTargetTypes = [
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

const isCaputuringTargetType = (currentNode) => {
  return caputuringTargetTypes.indexOf(currentNode.type) !== -1;
};

const isCalleeOfParent = (parentNode, currentKey) => {
  return (parentNode.type === 'CallExpression' || parentNode.type === 'NewExpression') && currentKey === 'callee';
};

const isChildOfTaggedTemplateExpression = (parentNode) => {
  return parentNode.type === 'TaggedTemplateExpression';
};

const isYieldOrAwaitArgument = (parentNode, currentKey) => {
  // capture the yielded/await result, not the promise
  return (parentNode.type === 'YieldExpression' || parentNode.type === 'AwaitExpression') && currentKey === 'argument';
};

const toBeCaptured = (controller) => {
  const currentNode = controller.current();
  const parentNode = getParentNode(controller);
  const currentKey = getCurrentKey(controller);
  return isCaputuringTargetType(currentNode) &&
        !isYieldOrAwaitArgument(parentNode, currentKey) &&
        !isCalleeOfParent(parentNode, currentKey) &&
        !isChildOfTaggedTemplateExpression(parentNode);
};

export {
  toBeCaptured
}
