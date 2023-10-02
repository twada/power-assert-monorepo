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

function parseFixture (filepath: string): Node {
  return parse(readFileSync(filepath).toString(), {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true,
    ranges: true,
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
    it(fixtureName, () => {
      const fixtureFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'fixture.mjs');
      const expectedFilepath = resolve(__dirname, '..', '..', '..', 'fixtures', fixtureName, 'expected.mjs');
      const expected = readFileSync(expectedFilepath).toString();

      const ast = parseFixture(fixtureFilepath);
      const modifiedAst = espowerAst(ast, {
        // runtime: 'espower3/runtime',
        code: readFileSync(fixtureFilepath).toString()
      });
      const actual = generate(modifiedAst);
      // console.log(actual);
      assert.equal(actual, expected);
    });
  }
});
