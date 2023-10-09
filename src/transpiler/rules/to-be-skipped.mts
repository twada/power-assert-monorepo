import type { Node, Property } from 'estree';

type NodeKey = string | number | symbol | null | undefined;

const supportedNodes = new Set([
  'Literal',
  'Identifier',
  'MemberExpression',
  'CallExpression',
  'UnaryExpression',
  'BinaryExpression',
  'LogicalExpression',
  'AssignmentExpression',
  'ObjectExpression',
  'NewExpression',
  'ArrayExpression',
  'ConditionalExpression',
  'UpdateExpression',
  'SequenceExpression',
  'TemplateLiteral',
  'TaggedTemplateExpression',
  'SpreadElement',
  'YieldExpression',
  'AwaitExpression',
  'Property'
]);

function isSupportedNode (node: Node): boolean {
  return supportedNodes.has(node.type);
}

const isLeftHandSideOfAssignment = (parentNode: Node, currentKey: NodeKey) => {
  // Do not instrument left due to 'Invalid left-hand side in assignment'
  return parentNode.type === 'AssignmentExpression' && currentKey === 'left';
};

const isChildOfObjectLiteral = (parentNode: Node) => {
  return parentNode.type === 'Property' && parentNode.kind === 'init';
};

function isObjectLiteralKey (parentNode: Node, currentKey: NodeKey): parentNode is Property {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'key';
}

function isObjectLiteralValue (parentNode: Node, currentKey: NodeKey): parentNode is Property {
  return isChildOfObjectLiteral(parentNode) && currentKey === 'value';
}

const isNonComputedObjectLiteralKey = (parentNode: Node, currentKey: NodeKey) => {
  // Do not instrument non-computed Object literal key
  return isObjectLiteralKey(parentNode, currentKey) && !parentNode.computed;
};

const isShorthandedValueOfObjectLiteral = (parentNode: Node, currentKey: NodeKey) => {
  // Do not instrument shorthanded Object literal value
  return isObjectLiteralValue(parentNode, currentKey) && parentNode.shorthand;
};

const isUpdateExpression = (parentNode: Node) => {
  // Just wrap UpdateExpression, not digging in.
  return parentNode.type === 'UpdateExpression';
};

const isCallExpressionWithNonComputedMemberExpression = (currentNode: Node, parentNode: Node, currentKey: NodeKey) => {
  // Do not instrument non-computed property of MemberExpression within CallExpression.
  return currentNode.type === 'Identifier' && parentNode.type === 'MemberExpression' && !parentNode.computed && currentKey === 'property';
};

const isTypeOfOrDeleteUnaryExpression = (currentNode: Node, parentNode: Node, currentKey: NodeKey) => {
  // 'typeof Identifier' or 'delete Identifier' is not instrumented
  return currentNode.type === 'Identifier' && parentNode.type === 'UnaryExpression' && (parentNode.operator === 'typeof' || parentNode.operator === 'delete') && currentKey === 'argument';
};

const toBeSkipped = ({ currentNode, parentNode, currentKey }: {currentNode: Node, parentNode: Node, currentKey: NodeKey}) => {
  return !isSupportedNode(currentNode) ||
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
