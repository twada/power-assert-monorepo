import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateAssertionRelativeOffsetFor } from '../address.mjs';
import { parse } from 'acorn';
import { parseModule } from 'meriyah';
import type { Node, Program, ExpressionStatement } from 'estree';

function dig (root: Node, espath: string): Node {
  return espath.split('/').reduce((node, key) => {
    if (node && typeof node === 'object' && key in node) {
      return node[key];
    } else {
      throw new Error(`Invalid espath: ${espath}`);
    }
  }, root as any);
}

function parseByMeriyah (code: string, loc: boolean, ranges: boolean): Program {
  return parseModule(code, {
    // The flag to enable start, end offsets and range: [start, end] to each node
    ranges,
    // The flag to enable line/column location information to each node
    loc,
    raw: true
  }) as Program;
}
parseByMeriyah.parserName = 'meriyah';

function parseByAcorn (code: string, locations: boolean, ranges: boolean): Program {
  return parse(code, {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations,
    ranges,
  }) as Program;
}
parseByAcorn.parserName = 'acorn';

describe('calculateAssertionRelativeOffsetFor', () => {
  const fixtures = [
    {
      name: 'Identifier',
      code: 'assert.ok(truthy)',
      espath: 'arguments/0',
      expected: {
        markerPos: 10,
        startPos: 10,
        endPos: 16,
      }
    },
    {
      name: 'Multi-line assertion arg0',
      code: `assert.equal(truthy,
  falsy,
  'falsy is not truthy')`,
      espath: 'arguments/0',
      expected: {
        markerPos: 13,
        startPos: 13,
        endPos: 19,
      }
    },
    {
      name: 'Multi-line assertion arg1',
      code: `assert.equal(truthy,
  falsy,
  'falsy is not truthy')`,
      espath: 'arguments/1',
      expected: {
        markerPos: 23,
        startPos: 23,
        endPos: 28,
      }
    },
    {
      name: 'Multi-line BinaryExpression',
      code: `assert(truthy
       ===
       falsy)`,
      espath: 'arguments/0',
      expected: {
        markerPos: 21,
        startPos: 7,
        endPos: 37,
      }
    },
  ];
  for (const { name, code, espath, expected } of fixtures) {
    for (const loc of [true, false]) {
      for (const range of [true, false]) {
        for (const parseFixture of [parseByMeriyah, parseByAcorn]) {
          if (loc === false && range === false) {
            break;
          }
          const runFixture = () => {
            it(`${name}, parser: ${parseFixture.parserName}, locations:${loc}, ranges:${range}`, () => {
              const ast = parseFixture(code, loc, range);
              const callExpression = (ast.body[0] as ExpressionStatement).expression;
              const targetNode = dig(callExpression, espath);
              const actual = calculateAssertionRelativeOffsetFor(targetNode, callExpression, code);
              assert.deepEqual(actual, expected);
            });
          };
          runFixture();
        }
      }
    }
  }
});
