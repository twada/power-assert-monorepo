import { describe, it } from 'node:test';
import { espowerAst } from '../src/index.mjs';
import assert from 'node:assert/strict';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { parse } from 'acorn';
import { generate } from 'escodegen';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseFixture (filepath) {
  return parse(readFileSync(filepath), {
    sourceType: 'module',
    ecmaVersion: '2022',
    locations: true,
    ranges: true,
    sourceFile: filepath
  });
}

describe('espowerAst', () => {
  it('instrumentation', () => {
    const fixtureName = 'Identifier';
    // const fixtureName = 'BinaryExpression';
    // const fixtureName = 'MemberExpression';
    // const fixtureName = 'CallExpression';
    const fixtureFilepath = resolve(__dirname, 'fixtures', fixtureName, 'fixture.mjs');
    const expectedFilepath = resolve(__dirname, 'fixtures', fixtureName, 'expected.mjs');
    const expected = readFileSync(expectedFilepath).toString();

    const ast = parseFixture(fixtureFilepath);
    const modifiedAst = espowerAst(ast, {
      runtime: '../../../runtime/runtime.mjs',
      code: readFileSync(fixtureFilepath).toString()
    });
    const actual = generate(modifiedAst);

    console.log(actual);

    assert.equal(actual + '\n', expected);
    // console.log(expected);
    // assert(false);
  });
});
