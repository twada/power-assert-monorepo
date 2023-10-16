import type {
  Node,
  Position,
  CallExpression,
  MemberExpression,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
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

export function searchAddress (currentNode: Node, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
    return calculateAddressOf(currentNode, offset, code) - offset;
  } else {
    return calculateAddressOf(currentNode, offset, code) - offset.column;
  }
}

function calculateAddressOf (currentNode: Node, offset: Position | number, code: string): number {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyAddressOf(currentNode, offset, code);
    case 'CallExpression':
      return openingParenAddressOf(currentNode, offset, code);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorAddressOf(currentNode, offset, code);
    case 'ConditionalExpression':
      return questionMarkAddressOf(currentNode, offset, code);
    default:
      break;
  }
  if (typeof offset === 'number') {
    return getRange(currentNode)[0];
  } else {
    assert(currentNode.loc, 'Node must have location information');
    return currentNode.loc.start.column;
  }
}

function questionMarkAddressOf (conditionalExpression: ConditionalExpression, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
    const baseLoc = getRange(conditionalExpression.test);
    const searchStart = baseLoc[1] - offset - 1;
    const found = code.indexOf('?', searchStart);
    if (found !== -1) {
      return found + offset;
    } else {
      return baseLoc[0];
    }
  } else {
    assert(conditionalExpression.test.loc, 'Node must have location information');
    const baseLoc = conditionalExpression.test.loc.end;
    const searchStart = baseLoc.column - offset.column - 1;
    const found = code.indexOf('?', searchStart);
    if (found !== -1) {
      return found + offset.column;
    } else {
      return conditionalExpression.test.loc.start.column;
    }
  }
}

function openingParenAddressOf (callExpression: CallExpression, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
    const baseLoc = getRange(callExpression.callee);
    const searchStart = baseLoc[1] - offset - 1;
    const found = code.indexOf('(', searchStart);
    if (found !== -1) {
      return found + offset;
    } else {
      return baseLoc[0];
    }
  } else {
    assert(callExpression.callee.loc, 'Node must have location information');
    const baseLoc = callExpression.callee.loc.end;
    const searchStart = baseLoc.column - offset.column - 1;
    const found = code.indexOf('(', searchStart);
    if (found !== -1) {
      return found + offset.column;
    } else {
      return callExpression.callee.loc.start.column;
    }
  }
}

function propertyAddressOf (memberExpression: MemberExpression, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
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
  } else {
    assert(memberExpression.property.loc, 'Node must have location information');
    const baseLoc = memberExpression.property.loc.start;
    if (!memberExpression.computed) {
      return baseLoc.column;
    }
    const searchStart = baseLoc.column - offset.column - 1;
    const found = code.indexOf('[', searchStart);
    if (found !== -1) {
      return found + offset.column;
    } else {
      return baseLoc.column;
    }
  }
}

// calculate address of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorAddressOf (expression: BinaryExpression | LogicalExpression | AssignmentExpression, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
    const baseLoc = getRange(expression.left);
    const searchStart = baseLoc[0] - offset - 1;
    const found = code.indexOf(expression.operator, searchStart);
    if (found !== -1) {
      return found + offset;
    } else {
      return baseLoc[0];
    }
  } else {
    assert(expression.left.loc, 'Node must have location information');
    const baseLoc = expression.left.loc.start;
    const searchStart = baseLoc.column - offset.column - 1;
    const found = code.indexOf(expression.operator, searchStart);
    if (found !== -1) {
      return found + offset.column;
    } else {
      return baseLoc.column;
    }
  }
}
