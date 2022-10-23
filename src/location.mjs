export function locationOf (currentNode, tokens, offset, code) {
  return applyOffset(locOf(currentNode, tokens, offset, code), offset);
}

function applyOffset (start, offset) {
  return {
    column: start.column - offset.column,
    line: start.line - offset.line
  };
}

export function locOf (currentNode, tokens, offset, code) {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyLocationOf(currentNode, tokens, offset, code);
    case 'CallExpression':
      if (currentNode.callee.type === 'MemberExpression') {
        return propertyLocationOf(currentNode.callee, tokens, offset, code);
      }
      break;
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorLocationOf(currentNode, tokens, offset, code);
    default:
      break;
  }
  return currentNode.loc.start;
}

function propertyLocationOf (memberExpression, tokens, offset, code) {
  const baseLoc = memberExpression.property.loc.start;
  if (!memberExpression.computed) {
    return baseLoc;
  }
  const start = baseLoc.column - offset.column - 1;
  const found = code.indexOf('[', start);
  if (found !== -1) {
    return {
      column: found + offset.column,
      line: baseLoc.line
    };
  } else {
    return baseLoc;
  }
}

// calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorLocationOf (expression, tokens, offset, code) {
  const baseLoc = expression.left.loc.start;
  const start = baseLoc.column - offset.column - 1;
  const found = code.indexOf(expression.operator, start);
  if (found !== -1) {
    return {
      column: found + offset.column,
      line: baseLoc.line
    };
  } else {
    return baseLoc;
  }
}
