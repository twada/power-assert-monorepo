import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssertionVisitor } from '../src/index.mjs';
import { parse, parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';

describe('AssertionVisitor', () => {
  const options = {
    sourceType: 'module',
    ecmaVersion: '2022',
    locations: true,
    ranges: true,
    sourceFile: '/path/to/source.mjs'
  };
  const fakeTransformation = {
    insertDecl: (controller, decl) => {},
    generateUniqueName: (str) => `${str}1`
  };
  const decoratorFunctionIdent = {
    type: 'Identifier',
    name: '_power_'
  };

  describe('after #enter', () => {
    let assertionVisitor;

    beforeEach(() => {
      const code = `
import assert from 'node:assert/strict';
const truthy = 1;
const falsy = 0;
assert.ok(truthy  ===  falsy);
`;
      // const ast = parse(code, options);
      assertionVisitor = new AssertionVisitor({
        transformation: fakeTransformation,
        decoratorFunctionIdent,
        wholeCode: code
      });

      // act
      const callexp = parseExpressionAt(code, code.lastIndexOf('assert.ok'), options);
      const controller = {
        path: () => ['body', 3, 'expression'],
        current: () => callexp
      };
      assertionVisitor.enter(controller);
      // console.log(assertionVisitor);
    });

    it('assertionCode is generated', () => {
      assert.equal(assertionVisitor.assertionCode, 'assert.ok(truthy  ===  falsy)');
    });

    it('poweredAssertIdent is generated', () => {
      assert(assertionVisitor.poweredAssertIdent !== undefined);
      const pwIdent = assertionVisitor.poweredAssertIdent;
      assert.equal(pwIdent.type, 'Identifier');
      assert.equal(pwIdent.name, 'asrt1');
    });

    it('#isCapturingArgument returns false', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), false);
    });
  });
});
