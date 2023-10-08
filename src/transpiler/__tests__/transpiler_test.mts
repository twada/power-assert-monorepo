import { describe, it } from 'node:test';
import { espowerAst } from '../transpiler-core.mjs';
import { strict as assert } from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
// import { parse } from 'acorn';
import { parseModule } from 'meriyah';
import { generate } from 'astring';
import { fileURLToPath } from 'node:url';
import type { Node } from 'estree';
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseFixture (filepath: string, loc: boolean, ranges: boolean): Node {
  // return parse(readFileSync(filepath).toString(), {
  //   sourceType: 'module',
  //   ecmaVersion: 2022,
  //   locations,
  //   ranges,
  //   sourceFile: filepath
  // }) as Node;
  return parseModule(readFileSync(filepath).toString(), {
    // The flag to enable start, end offsets and range: [start, end] to each node
    ranges,
    // The flag to enable line/column location information to each node
    loc,
    raw: true
  }) as Node;
}

describe('espowerAst', () => {
  const fixtures = [
    'ArrayExpression',
    'ArrowFunctionExpression',
    'AssignmentExpression',
    'AwaitExpression',
    'BinaryExpression',
    'CallExpression',
    'ClassExpression',
    'ClassScope',
    // 'ConditionalExpression',
    'FunctionExpression',
    'Identifier',
    'Literal',
    'LogicalExpression',
    'MemberExpression',
    'NewExpression',
    'ObjectExpression',
    // 'ObjectRestSpread',
    'Property',
    'Scopes',
    // 'SequenceExpression',
    // 'SpreadElement',
    'TaggedTemplateExpression',
    'TemplateLiteral',
    'UnaryExpression',
    'UpdateExpression',
    'YieldExpression'
  ];
  for (const fixtureName of fixtures) {
    for (const loc of [true, false]) {
      for (const range of [true, false]) {
        if (loc === false && range === false) {
          break;
        }
        it(`${fixtureName}, locations:${loc}, ranges:${range}`, () => {
          const fixtureFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'fixture.mjs');
          const expectedFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'expected.mjs');
          // const actualFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'actual.mjs');
          const expected = readFileSync(expectedFilepath).toString();
          const ast = parseFixture(fixtureFilepath, loc, range);
          const modifiedAst = espowerAst(ast, {
            // runtime: 'espower3/runtime',
            code: readFileSync(fixtureFilepath).toString()
          });
          const actual = generate(modifiedAst);
          // console.log(actual);
          // if (actual !== expected) {
          //   writeFileSync(actualFilepath, actual);
          //   writeFileSync(expectedFilepath, actual);
          // }
          assert.equal(actual, expected);
        });
      }
    }
  }
});
