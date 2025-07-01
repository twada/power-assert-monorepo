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

export type AssertionRelativeOffset = {
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

export function calculateAssertionRelativeOffsetFor (currentNode: Node, baseNode: Node, code: string): AssertionRelativeOffset {
  let base: Position | number;
  if (baseNode.range) {
    base = baseNode.range[0];
  } else if (isAcornSwcNode(baseNode)) {
    base = baseNode.start;
  } else if (baseNode.loc) {
    base = baseNode.loc.start;
  } else {
    assert(false, 'Node must have range or location information');
  }
  return {
    markerPos: calculateMarkerPosOf(currentNode, base, code),
    startPos: startPosOf(currentNode, base, code),
    endPos: endPosOf(currentNode, base, code)
  };
}

function calculateMarkerPosOf (currentNode: Node, base: Position | number, code: string): number {
  switch (currentNode.type) {
    case 'MemberExpression':
      return propertyAddressOf(currentNode, base, code);
    case 'CallExpression':
      return calculateCallExpressionAddress(currentNode, base, code);
    case 'BinaryExpression':
    case 'LogicalExpression':
    case 'AssignmentExpression':
      return infixOperatorAddressOf(currentNode, base, code);
    case 'ConditionalExpression':
      return questionMarkAddressOf(currentNode, base, code);
    case 'UpdateExpression':
      if (currentNode.prefix) {
        return startPosOf(currentNode, base, code);
      } else {
        return suffixOperatorAddressOf(currentNode, base, code);
      }
    default:
      break;
  }
  return startPosOf(currentNode, base, code);
}

function propertyAddressOf (memberExpression: MemberExpression, base: Position | number, code: string): number {
  if (memberExpression.computed) {
    return searchFor('[', memberExpression.object, base, code);
  } else {
    return startPosOf(memberExpression.property, base, code);
  }
}

function questionMarkAddressOf (conditionalExpression: ConditionalExpression, base: Position | number, code: string): number {
  return searchFor('?', conditionalExpression.test, base, code);
}

function calculateCallExpressionAddress (callExpression: CallExpression, base: Position | number, code: string): number {
  switch (callExpression.callee.type) {
    case 'Identifier':
      // for callee like `foo()`, foo's offset is used
      return startPosOf(callExpression.callee, base, code);
    case 'MemberExpression':
      if (!callExpression.callee.computed) {
        // for callee like `foo.bar()`, bar's offset is used
        return propertyAddressOf(callExpression.callee, base, code);
      }
      break;
    default:
      break;
  }
  // otherwise, offset of opening parenthesis is used
  return openingParenAddressOf(callExpression, base, code);
}

function openingParenAddressOf (callExpression: CallExpression, base: Position | number, code: string): number {
  return searchFor('(', callExpression.callee, base, code);
}

function suffixOperatorAddressOf (expression: UpdateExpression, base: Position | number, code: string): number {
  return searchFor(expression.operator, expression.argument, base, code);
}

// calculate address of infix operator for BinaryExpression, AssignmentExpression and LogicalExpression.
function infixOperatorAddressOf (expression: BinaryExpression | LogicalExpression | AssignmentExpression, base: Position | number, code: string): number {
  return searchFor(expression.operator, expression.left, base, code);
}

function startPosOf (node: Node, base: Position | number, code: string): number {
  if (typeof base === 'number') {
    return getRange(node)[0] - base;
  } else {
    assert(node.loc, 'Node must have location information');
    return columnToPos(node.loc.start, base, code);
  }
}

function endPosOf (node: Node, base: Position | number, code: string): number {
  if (typeof base === 'number') {
    return getRange(node)[1] - base;
  } else {
    assert(node.loc, 'Node must have location information');
    return columnToPos(node.loc.end, base, code);
  }
}

function searchFor (searchString: string, searchStartNode: Node, base: Position | number, code: string): number {
  if (typeof base === 'number') {
    const startNodeRange = getRange(searchStartNode);
    const searchStart = startNodeRange[1] - base - 1;
    const found = code.indexOf(searchString, searchStart);
    if (found !== -1) {
      return found;
    } else {
      return startNodeRange[0] - base;
    }
  } else {
    assert(searchStartNode.loc, 'Node must have location information');
    const searchStart = columnToPos(searchStartNode.loc.end, base, code) - 1;
    const found = code.indexOf(searchString, searchStart);
    if (found !== -1) {
      return found;
    } else {
      return columnToPos(searchStartNode.loc.start, base, code);
    }
  }
}

function columnToPos (target: Position, base: Position, code: string): number {
  if (target.line === base.line) {
    return target.column - base.column;
  }
  const howManyLines = target.line - base.line;
  const lines = code.split('\n');
  let pos = 0;
  for (let i = 0; i < howManyLines; i++) {
    pos += lines[i].length + 1; // +1 for newline character
  }
  pos += target.column;
  return pos;
}
