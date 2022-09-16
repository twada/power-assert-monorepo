const supportedNodeTypes = () => [
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
];

export {
  supportedNodeTypes
}
