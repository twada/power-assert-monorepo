export function locationOf (currentNode, tokens, rangeOffset) {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyLocationOf(currentNode, tokens);
    case 'CallExpression':
      if (currentNode.callee.type === 'MemberExpression') {
        return propertyLocationOf(currentNode.callee, tokens);
      }
      break;
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorLocationOf(currentNode, tokens);
    default:
      break;
  }
  return applyOffset(currentNode.range, rangeOffset);
}

function applyOffset (range, rangeOffset) {
  return [
    range[0] - rangeOffset,
    range[1] - rangeOffset
  ];
}

function propertyLocationOf (memberExpression, tokens) {
  const prop = memberExpression.property;
  if (!memberExpression.computed) {
    return prop.range;
  }
  const token = findLeftBracketTokenOf(memberExpression, tokens);
  return token ? token.range : prop.range;
}

// calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorLocationOf (expression, tokens) {
  const token = findOperatorTokenOf(expression, tokens);
  return token ? token.range : expression.left.range;
}

function findLeftBracketTokenOf (expression, tokens) {
  const fromColumn = expression.property.range[0];
  return searchToken(tokens, (token, index) => {
    if (token.range[0] === fromColumn) {
      const prevToken = tokens[index - 1];
      // if (prevToken.type === 'Punctuator' && prevToken.value === '[') {  // esprima
      if (prevToken.type.label === '[') { // acorn
        return prevToken;
      }
    }
    return undefined;
  });
}

function findOperatorTokenOf (expression, tokens) {
  const fromColumn = expression.left.range[1];
  const toColumn = expression.right.range[0];
  return searchToken(tokens, (token, index) => {
    if (fromColumn < token.range[0] &&
            token.range[1] < toColumn &&
            token.value === expression.operator) {
      return token;
    }
    return undefined;
  });
}

function searchToken (tokens, searcher) {
  for (let i = 0; i < tokens.length; i += 1) {
    const found = searcher(tokens[i], i);
    if (found) {
      return found;
    }
  }
  return undefined;
}
