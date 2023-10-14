import type {
  Node,
  CallExpression,
  MemberExpression,
  BinaryExpression,
  LogicalExpression,
  AssignmentExpression
} from 'estree';
import { strict as assert } from 'node:assert';

type Range = [number, number];

type AcornSwcNode = Node & {
  start: number;
  end: number;
};

function isAcornSwcNode (node: Node): node is AcornSwcNode {
  return Object.hasOwn(node, 'start') && Object.hasOwn(node, 'end');
}

function getRange (node: Node): Range {
  if (node.range) {
    return node.range;
  }
  if (isAcornSwcNode(node)) {
    return [node.start, node.end];
  } else {
    assert(false, 'Node must have range or start/end');
  }
}

export function searchAddressByRange (currentNode: Node, offset: number, code: string): number {
  return calculateAddressOf(currentNode, offset, code) - offset;
}

function calculateAddressOf (currentNode: Node, offset: number, code: string): number {
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
  return getRange(currentNode)[0];
}

function openingParenAddressOf (callExpression: CallExpression, offset: number, code: string): number {
  const baseLoc = getRange(callExpression.callee);
  const searchStart = baseLoc[1] - offset - 1;
  const found = code.indexOf('(', searchStart);
  if (found !== -1) {
    return found + offset;
  } else {
    return baseLoc[0];
  }
}

function propertyAddressOf (memberExpression: MemberExpression, offset: number, code: string): number {
  const baseLoc = getRange(memberExpression.property);
  if (!memberExpression.computed) {
    return baseLoc[0];
  }
  const searchStart = baseLoc[0] - offset - 1;
  const found = code.indexOf('[', searchStart);
  if (found !== -1) {
    return found + offset;
  } else {
    return baseLoc[0];
  }
}

// calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorAddressOf (expression: (BinaryExpression | LogicalExpression | AssignmentExpression), offset: number, code: string): number {
  const baseLoc = getRange(expression.left);
  const searchStart = baseLoc[0] - offset - 1;
  const found = code.indexOf(expression.operator, searchStart);
  if (found !== -1) {
    return found + offset;
  } else {
    return baseLoc[0];
  }
}
