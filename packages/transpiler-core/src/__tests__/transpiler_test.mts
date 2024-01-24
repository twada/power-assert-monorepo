import { describe, it } from 'node:test';
import { espowerAst } from '../transpiler-core.mjs';
import { strict as assert } from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parse } from 'acorn';
import { parseModule } from 'meriyah';
import { generate } from 'astring';
import { fileURLToPath } from 'node:url';
import type { Node } from 'estree';
import type { EspowerOptions } from '../transpiler-core.mjs';
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseByMeriyah (filepath: string, loc: boolean, ranges: boolean): Node {
  return parseModule(readFileSync(filepath).toString(), {
    // The flag to enable start, end offsets and range: [start, end] to each node
    ranges,
    // The flag to enable line/column location information to each node
    loc,
    raw: true
  }) as Node;
}
parseByMeriyah.parserName = 'meriyah';

function parseByAcorn (filepath: string, locations: boolean, ranges: boolean): Node {
  return parse(readFileSync(filepath).toString(), {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations,
    ranges,
    sourceFile: filepath
  }) as Node;
}
parseByAcorn.parserName = 'acorn';

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
    'ConditionalExpression',
    'FunctionExpression',
    'Identifier',
    'Literal',
    'MultibyteStringLiteral',
    'LogicalExpression',
    'MemberExpression',
    'NewExpression',
    'ObjectExpression',
    'ObjectRestSpread',
    'Property',
    'SequenceExpression',
    'SpreadElement',
    'TaggedTemplateExpression',
    'TemplateLiteral',
    'UnaryExpression',
    'UpdateExpression',
    'YieldExpression',
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
    'ImportSpecifier',
    'VitestConfig',
    'Scopes'
  ];
  for (const fixtureName of fixtures) {
    for (const loc of [true, false]) {
      for (const range of [true, false]) {
        for (const parseFixture of [parseByMeriyah, parseByAcorn]) {
          if (loc === false && range === false) {
            break;
          }
          const runFixture = (cond?: string, suffix?: string) => {
            it(`${fixtureName}${cond}${suffix}, parser: ${parseFixture.parserName}, locations:${loc}, ranges:${range}`, () => {
              const fixtureFilepath = resolve(__dirname, '..', '..', 'fixtures', fixtureName, `fixture${cond ?? ''}.mjs`);
              const expectedFilepath = resolve(__dirname, '..', '..', 'fixtures', fixtureName, `expected${suffix ?? ''}.mjs`);
              const actualFilepath = resolve(__dirname, '..', '..', 'fixtures', fixtureName, `actual${suffix ?? ''}.mjs`);
              const expected = readFileSync(expectedFilepath).toString();
              const ast = parseFixture(fixtureFilepath, loc, range);
              const powerAssertConfig: EspowerOptions = {
                code: readFileSync(fixtureFilepath).toString()
              };
              if (fixtureName === 'VitestConfig') {
                powerAssertConfig.modules = [
                  {
                    source: 'vitest',
                    imported: ['assert']
                  }
                ];
              }
              const modifiedAst = espowerAst(ast, powerAssertConfig);
              const actual = generate(modifiedAst);
              if (actual !== expected) {
                writeFileSync(actualFilepath, actual);
              }
              assert.equal(actual, expected);
            });
          };
          const conditionalFixtureFilepath = resolve(__dirname, '..', '..', 'fixtures', fixtureName, 'fixture.cond.mjs');
          if (existsSync(conditionalFixtureFilepath)) {
            runFixture('.cond', '.core');
          }
          runFixture();
        }
      }
    }
  }
});
