import type {
  Node,
  Position,
  MemberExpression,
  BinaryExpression,
  LogicalExpression,
  AssignmentExpression
} from 'estree';
import { strict as assert } from 'node:assert';

export function positionOf (currentNode: Node, offset: Position, code: string): Position {
  return applyOffset(calculatePositionOf(currentNode, offset, code), offset);
}

function applyOffset (start: Position, offset: Position): Position {
  return {
    column: start.column - offset.column,
    line: start.line - offset.line
  };
}

function calculatePositionOf (currentNode: Node, offset: Position, code: string): Position {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyLocationOf(currentNode, offset, code);
    case 'CallExpression':
      if (currentNode.callee.type === 'MemberExpression') {
        return propertyLocationOf(currentNode.callee, offset, code);
      }
      break;
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorLocationOf(currentNode, offset, code);
    default:
      break;
  }
  assert(currentNode.loc, 'Node must have location information');
  return currentNode.loc.start;
}

function propertyLocationOf (memberExpression: MemberExpression, offset: Position, code: string): Position {
  assert(memberExpression.property.loc, 'Node must have location information');
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
function infixOperatorLocationOf (expression: (BinaryExpression | LogicalExpression | AssignmentExpression), offset: Position, code: string): Position {
  assert(expression.left.loc, 'Node must have location information');
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
