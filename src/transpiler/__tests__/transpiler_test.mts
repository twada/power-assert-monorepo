import { describe, it } from 'node:test';
import { espowerAst } from '../transpiler-core.mjs';
import { strict as assert } from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { generate } from 'astring';
import { fileURLToPath } from 'node:url';
import type { Node } from 'estree';
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseFixture (filepath: string, loc: boolean): Node {
  return parse(readFileSync(filepath).toString(), {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: loc,
    ranges: loc,
    sourceFile: filepath
  }) as Node;
}

describe('espowerAst', () => {
  const fixtures = [
    'Identifier',
    'BinaryExpression',
    'MemberExpression',
    'CallExpression'
  ];
  for (const fixtureName of fixtures) {
    for (const loc of [true, false]) {
      it(`${fixtureName}: loc:${loc}`, () => {
        const fixtureFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'fixture.mjs');
        const expectedFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'expected.mjs');
        const expected = readFileSync(expectedFilepath).toString();

        const ast = parseFixture(fixtureFilepath, loc);
        const modifiedAst = espowerAst(ast, {
          // runtime: 'espower3/runtime',
          code: readFileSync(fixtureFilepath).toString()
        });
        const actual = generate(modifiedAst);
        // console.log(actual);
        assert.equal(actual, expected);
      });
    }
  }
});
