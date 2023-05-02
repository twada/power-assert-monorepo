import { supportedNodeTypes } from './supported-node-types.mjs';
import type { Node, Property } from 'estree';

const isLeftHandSideOfAssignment = (parentNode: Node, currentKey: string | number | null) => {
  // Do not instrument left due to 'Invalid left-hand side in assignment'
  return parentNode.type === 'AssignmentExpression' && currentKey === 'left';
};

const isChildOfObjectLiteral = (parentNode: Node) => {
  return parentNode.type === 'Property' && parentNode.kind === 'init';
};

function isObjectLiteralKey (parentNode: Node, currentKey: string | number | null): parentNode is Property {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'key';
}

function isObjectLiteralValue (parentNode: Node, currentKey: string | number | null): parentNode is Property {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'value';
}

const isNonComputedObjectLiteralKey = (parentNode: Node, currentKey: string | number | null) => {
  // Do not instrument non-computed Object literal key
  return isObjectLiteralKey(parentNode, currentKey) && !parentNode.computed;
};

const isShorthandedValueOfObjectLiteral = (parentNode: Node, currentKey: string | number | null) => {
  // Do not instrument shorthanded Object literal value
  return isObjectLiteralValue(parentNode, currentKey) && parentNode.shorthand;
};

const isUpdateExpression = (parentNode: Node) => {
  // Just wrap UpdateExpression, not digging in.
  return parentNode.type === 'UpdateExpression';
};

const isCallExpressionWithNonComputedMemberExpression = (currentNode: Node, parentNode: Node, currentKey: string | number | null) => {
  // Do not instrument non-computed property of MemberExpression within CallExpression.
  return currentNode.type === 'Identifier' && parentNode.type === 'MemberExpression' && !parentNode.computed && currentKey === 'property';
};

const isTypeOfOrDeleteUnaryExpression = (currentNode: Node, parentNode: Node, currentKey: string | number | null) => {
  // 'typeof Identifier' or 'delete Identifier' is not instrumented
  return currentNode.type === 'Identifier' && parentNode.type === 'UnaryExpression' && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentKey === 'argument';
};

const isSupportedNodeType = (() => {
  const supported = supportedNodeTypes();
  return (node: Node) => {
    return supported.indexOf(node.type) !== -1;
  };
})();

const toBeSkipped = ({ currentNode, parentNode, currentKey }: {currentNode: Node, parentNode: Node, currentKey: string | number | null}) => {
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
};
