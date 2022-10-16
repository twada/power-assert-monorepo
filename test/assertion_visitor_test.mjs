import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AssertionVisitor } from '../src/index.mjs';
import { parse, parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';

describe('AssertionVisitor', () => {

  it('#enter', () => {
    const code = `
import assert from 'node:assert/strict';
const truthy = 1;
const falsy = 0;
assert.ok(truthy  ===  falsy);
`;
    const options = {
      sourceType: 'module',
      ecmaVersion: '2022',
      locations: true,
      ranges: true,
      sourceFile: '/path/to/source.mjs'
    };
    // const ast = parse(code, options);

    const idx = code.lastIndexOf('assert.ok');
    // console.log(`################## ${idx} ################`);
    const callexp = parseExpressionAt(code, idx, options);

    // console.log(JSON.stringify(callexp, null, 2));

    const controller = {
      path: () => ['body', 3, 'expression'],
      current: () => callexp
    };

    const transformation = {
      onCurrentBlock: (controller, callback) => {},
      generateUniqueName: (str) => `${str}1`
    };
    const decoratorFunctionIdent = {
      type: 'Identifier',
      name: '_power_'
    };

    const wholeCode = code;
    const assertionVisitor = new AssertionVisitor({ transformation, decoratorFunctionIdent, wholeCode });

    assertionVisitor.enter(controller);

    console.log(assertionVisitor);

    assert.equal(assertionVisitor.assertionCode(), 'assert.ok(truthy  ===  falsy)');
    // assert(false);
  });
});
