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
  return pickStartAddress(calculateRangeOf(currentNode, offset, code), offset);
}

function pickStartAddress (start: Range, offset: number): number {
  return start[0] - offset;
}

function calculateRangeOf (currentNode: Node, offset: number, code: string): Range {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyLocationOf(currentNode, offset, code);
    case 'CallExpression':
      return openingParenLocationOfCalleeOf(currentNode, offset, code);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorLocationOf(currentNode, offset, code);
    default:
      break;
  }
  return getRange(currentNode);
}

function openingParenLocationOfCalleeOf (callExpression: CallExpression, offset: number, code: string): Range {
  const baseLoc = getRange(callExpression.callee);
  const searchStart = baseLoc[1] - offset - 1;
  const found = code.indexOf('(', searchStart);
  if (found !== -1) {
    return [
      found + offset,
      found + offset + 1
    ];
  } else {
    return baseLoc;
  }
}

function propertyLocationOf (memberExpression: MemberExpression, offset: number, code: string): Range {
  const baseLoc = getRange(memberExpression.property);
  if (!memberExpression.computed) {
    return baseLoc;
  }
  const searchStart = baseLoc[0] - offset - 1;
  const found = code.indexOf('[', searchStart);
  if (found !== -1) {
    return [
      found + offset,
      found + offset + 1
    ];
  } else {
    return baseLoc;
  }
}

// calculate location of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorLocationOf (expression: (BinaryExpression | LogicalExpression | AssignmentExpression), offset: number, code: string): Range {
  const baseLoc = getRange(expression.left);
  const searchStart = baseLoc[0] - offset - 1;
  const found = code.indexOf(expression.operator, searchStart);
  if (found !== -1) {
    return [
      found + offset,
      found + offset + expression.operator.length
    ];
  } else {
    return baseLoc;
  }
}
