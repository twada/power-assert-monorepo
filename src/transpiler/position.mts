import type {
  Node,
  Position,
  CallExpression,
  MemberExpression,
  BinaryExpression,
  LogicalExpression,
  AssignmentExpression
} from 'estree';
import { strict as assert } from 'node:assert';

export function searchAddressByPosition (currentNode: Node, offset: Position, code: string): number {
  return calculateAddressOf(currentNode, offset, code) - offset.column;
}

function calculateAddressOf (currentNode: Node, offset: Position, code: string): number {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyAddressOf(currentNode, offset, code);
    case 'CallExpression':
      return openingParenAddressOf(currentNode, offset, code);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorAddressOf(currentNode, offset, code);
    default:
      break;
  }
  assert(currentNode.loc, 'Node must have location information');
  return currentNode.loc.start.column;
}

function openingParenAddressOf (callExpression: CallExpression, offset: Position, code: string): number {
  assert(callExpression.callee.loc, 'Node must have location information');
  const baseLoc = callExpression.callee.loc.end;
  const searchStart = baseLoc.column - offset.column - 1;
  const found = code.indexOf('(', searchStart);
  if (found !== -1) {
    return found + offset.column;
  } else {
    return baseLoc.column;
  }
}

function propertyAddressOf (memberExpression: MemberExpression, offset: Position, code: string): number {
  assert(memberExpression.property.loc, 'Node must have location information');
  const baseLoc = memberExpression.property.loc.start;
  if (!memberExpression.computed) {
    return baseLoc.column;
  }
  const start = baseLoc.column - offset.column - 1;
  const found = code.indexOf('[', start);
  if (found !== -1) {
    return found + offset.column;
  } else {
    return baseLoc.column;
  }
}

// calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorAddressOf (expression: (BinaryExpression | LogicalExpression | AssignmentExpression), offset: Position, code: string): number {
  assert(expression.left.loc, 'Node must have location information');
  const baseLoc = expression.left.loc.start;
  const start = baseLoc.column - offset.column - 1;
  const found = code.indexOf(expression.operator, start);
  if (found !== -1) {
    return found + offset.column;
  } else {
    return baseLoc.column;
  }
}
