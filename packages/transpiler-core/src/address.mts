import type {
  Node,
  Position,
  CallExpression,
  MemberExpression,
  BinaryExpression,
  LogicalExpression,
  ConditionalExpression,
  UpdateExpression,
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
    case 'UpdateExpression':
      if (currentNode.prefix) {
        return startAddressOf(currentNode, offset);
      } else {
        return suffixOperatorAddressOf(currentNode, offset, code);
      }
    default:
      break;
  }
  return startAddressOf(currentNode, offset);
}

function propertyAddressOf (memberExpression: MemberExpression, offset: Position | number, code: string): number {
  if (memberExpression.computed) {
    return searchFor('[', memberExpression.object, offset, code);
  } else {
    return startAddressOf(memberExpression.property, offset);
  }
}

function questionMarkAddressOf (conditionalExpression: ConditionalExpression, offset: Position | number, code: string): number {
  return searchFor('?', conditionalExpression.test, offset, code);
}

function openingParenAddressOf (callExpression: CallExpression, offset: Position | number, code: string): number {
  return searchFor('(', callExpression.callee, offset, code);
}

function suffixOperatorAddressOf (expression: UpdateExpression, offset: Position | number, code: string): number {
  return searchFor(expression.operator, expression.argument, offset, code);
}

// calculate address of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorAddressOf (expression: BinaryExpression | LogicalExpression | AssignmentExpression, offset: Position | number, code: string): number {
  return searchFor(expression.operator, expression.left, offset, code);
}

function startAddressOf (node: Node, offset: Position | number): number {
  if (typeof offset === 'number') {
    return getRange(node)[0];
  } else {
    assert(node.loc, 'Node must have location information');
    return node.loc.start.column;
  }
}

function searchFor (searchString: string, searchStartNode: Node, offset: Position | number, code: string): number {
  if (typeof offset === 'number') {
    const baseLoc = getRange(searchStartNode);
    const searchStart = baseLoc[1] - offset - 1;
    const found = code.indexOf(searchString, searchStart);
    if (found !== -1) {
      return found + offset;
    } else {
      return baseLoc[0];
    }
  } else {
    assert(searchStartNode.loc, 'Node must have location information');
    const baseLoc = searchStartNode.loc.end;
    const searchStart = baseLoc.column - offset.column - 1;
    const found = code.indexOf(searchString, searchStart);
    if (found !== -1) {
      return found + offset.column;
    } else {
      return searchStartNode.loc.start.column;
    }
  }
}
