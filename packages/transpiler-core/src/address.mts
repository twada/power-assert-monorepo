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

export type Address = {
  markerPos: number;
  startPos: number;
  endPos: number;
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

export function calculateAddressFor (currentNode: Node, offsetNode: Node, code: string): Address {
  if (offsetNode.range) {
    const offset = offsetNode.range[0];
    return {
      markerPos: calculateMarkerPosOf(currentNode, offset, code) - offset,
      startPos: startPosOf(currentNode, offset, code) - offset,
      endPos: endPosOf(currentNode, offset, code) - offset
    };
  } else if (isAcornSwcNode(offsetNode)) {
    const offset = offsetNode.start;
    return {
      markerPos: calculateMarkerPosOf(currentNode, offset, code) - offset,
      startPos: startPosOf(currentNode, offset, code) - offset,
      endPos: endPosOf(currentNode, offset, code) - offset
    };
  } else if (offsetNode.loc) {
    const offset = offsetNode.loc.start;
    return {
      markerPos: calculateMarkerPosOf(currentNode, offset, code),
      startPos: startPosOf(currentNode, offset, code),
      endPos: endPosOf(currentNode, offset, code)
    };
  } else {
    assert(false, 'Node must have range or location information');
  }
}

function calculateMarkerPosOf (currentNode: Node, offset: Position | number, code: string): number {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyAddressOf(currentNode, offset, code);
    case 'CallExpression':
      return calculateCallExpressionAddress(currentNode, offset, code);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorAddressOf(currentNode, offset, code);
    case 'ConditionalExpression':
      return questionMarkAddressOf(currentNode, offset, code);
    case 'UpdateExpression':
      if (currentNode.prefix) {
        return startPosOf(currentNode, offset, code);
      } else {
        return suffixOperatorAddressOf(currentNode, offset, code);
      }
    default:
      break;
  }
  return startPosOf(currentNode, offset, code);
}

function propertyAddressOf (memberExpression: MemberExpression, offset: Position | number, code: string): number {
  if (memberExpression.computed) {
    return searchFor('[', memberExpression.object, offset, code);
  } else {
    return startPosOf(memberExpression.property, offset, code);
  }
}

function questionMarkAddressOf (conditionalExpression: ConditionalExpression, offset: Position | number, code: string): number {
  return searchFor('?', conditionalExpression.test, offset, code);
}

function calculateCallExpressionAddress (callExpression: CallExpression, offset: Position | number, code: string): number {
  switch (callExpression.callee.type) {
    case 'Identifier':
      // for callee like `foo()`, foo's offset is used
      return startPosOf(callExpression.callee, offset, code);
    case 'MemberExpression':
      if (!callExpression.callee.computed) {
        // for callee like `foo.bar()`, bar's offset is used
        return propertyAddressOf(callExpression.callee, offset, code);
      }
      break;
    default:
      break;
  }
  // otherwise, offset of opening parenthesis is used
  return openingParenAddressOf(callExpression, offset, code);
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

function startPosOf (node: Node, offset: Position | number, code: string): number {
  if (node.range) {
    return node.range[0];
  } else if (isAcornSwcNode(node)) {
    return node.start;
  } else if (node.loc) {
    assert(typeof offset !== 'number', 'Offset must not be a number when node has location information');
    return columnToPos(node.loc.start, offset, code);
  } else {
    assert(false, 'Node must have range or location information');
  }
}

function endPosOf (node: Node, offset: Position | number, code: string): number {
  if (node.range) {
    return node.range[1];
  } else if (isAcornSwcNode(node)) {
    return node.end;
  } else if (node.loc) {
    assert(typeof offset !== 'number', 'Offset must not be a number when node has location information');
    return columnToPos(node.loc.end, offset, code);
  } else {
    assert(false, 'Node must have range or location information');
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
    const searchStart = columnToPos(baseLoc, offset, code) - 1;
    const found = code.indexOf(searchString, searchStart);
    if (found !== -1) {
      return found;
    } else {
      return columnToPos(searchStartNode.loc.start, offset, code);
    }
  }
}

function columnToPos (target: Position, offset: Position, code: string): number {
  if (target.line === offset.line) {
    return target.column - offset.column;
  }
  const howManyLines = target.line - offset.line;
  const lines = code.split('\n');
  let pos = 0;
  for (let i = 0; i < howManyLines; i++) {
    pos += lines[i].length + 1; // +1 for newline character
  }
  pos += target.column;
  return pos;
}
