import { supportedNodeTypes } from './supported-node-types.mjs';

const isLeftHandSideOfAssignment = (parentNode, currentKey) => {
  // Do not instrument left due to 'Invalid left-hand side in assignment'
  return parentNode.type === 'AssignmentExpression' && currentKey === 'left';
};

const isChildOfObjectLiteral = (parentNode) => {
  return parentNode.type === 'Property' && parentNode.kind === 'init';
};

const isObjectLiteralKey = (parentNode, currentKey) => {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'key';
};

const isObjectLiteralValue = (parentNode, currentKey) => {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'value';
};

const isNonComputedObjectLiteralKey = (parentNode, currentKey) => {
  // Do not instrument non-computed Object literal key
  return isObjectLiteralKey(parentNode, currentKey) && !parentNode.computed;
};

const isShorthandedValueOfObjectLiteral = (parentNode, currentKey) => {
  // Do not instrument shorthanded Object literal value
  return isObjectLiteralValue(parentNode, currentKey) && parentNode.shorthand;
};

const isUpdateExpression = (parentNode) => {
  // Just wrap UpdateExpression, not digging in.
  return parentNode.type === 'UpdateExpression';
};

const isCallExpressionWithNonComputedMemberExpression = (currentNode, parentNode, currentKey) => {
  // Do not instrument non-computed property of MemberExpression within CallExpression.
  return currentNode.type === 'Identifier' && parentNode.type === 'MemberExpression' && !parentNode.computed && currentKey === 'property';
};

const isTypeOfOrDeleteUnaryExpression = (currentNode, parentNode, currentKey) => {
  // 'typeof Identifier' or 'delete Identifier' is not instrumented
  return currentNode.type === 'Identifier' && parentNode.type === 'UnaryExpression' && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentKey === 'argument';
};

const isSupportedNodeType = (() => {
  const supported = supportedNodeTypes();
  return (node) => {
    return supported.indexOf(node.type) !== -1;
  };
})();

const toBeSkipped = ({ currentNode, parentNode, currentKey }) => {
  return !isSupportedNodeType(currentNode) ||
        isLeftHandSideOfAssignment(parentNode, currentKey) ||
        isNonComputedObjectLiteralKey(parentNode, currentKey) ||
        isShorthandedValueOfObjectLiteral(parentNode, currentKey) ||
        isUpdateExpression(parentNode) ||
        isCallExpressionWithNonComputedMemberExpression(currentNode, parentNode, currentKey) ||
        isTypeOfOrDeleteUnaryExpression(currentNode, parentNode, currentKey);
};

export {
  toBeSkipped
}
