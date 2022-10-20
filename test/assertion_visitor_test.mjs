import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssertionVisitor } from '../src/index.mjs';
import { parse, parseExpressionAt } from 'acorn';
import { generate } from 'escodegen';

describe('AssertionVisitor', () => {
  let assertionVisitor;
  let callexp;

  beforeEach(() => {
    const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.ok(truthy);
`;
    const options = {
      sourceType: 'module',
      ecmaVersion: '2022',
      locations: true,
      ranges: true,
      sourceFile: '/path/to/source.mjs'
    };
    callexp = parseExpressionAt(code, code.lastIndexOf('assert.ok'), options);

    const fakeTransformation = {
      insertDecl: (controller, decl) => {},
      generateUniqueName: (str) => `_${str}1`
    };
    const decoratorFunctionIdent = {
      type: 'Identifier',
      name: '_power_'
    };
    // const ast = parse(code, options);
    assertionVisitor = new AssertionVisitor({
      transformation: fakeTransformation,
      decoratorFunctionIdent,
      wholeCode: code
    });
  });

  it('assertionCode is not generated', () => {
    assert(assertionVisitor.assertionCode === undefined);
  });
  it('#isCapturingArgument returns false', () => {
    assert.equal(assertionVisitor.isCapturingArgument(), false);
  });

  describe('after #enter', () => {
    beforeEach(() => {
      const controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      };
      assertionVisitor.enter(controller);
    });

    it('assertionCode is generated', () => {
      assert.equal(assertionVisitor.assertionCode, 'assert.ok(truthy)');
    });

    it('poweredAssertIdent is generated', () => {
      assert(assertionVisitor.poweredAssertIdent !== undefined);
      const pwIdent = assertionVisitor.poweredAssertIdent;
      assert.equal(pwIdent.type, 'Identifier');
      assert.equal(pwIdent.name, '_asrt1');
    });

    it('#isCapturingArgument returns false', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), false);
    });
  });

  describe('after #enterArgument', () => {
    let controller;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      };
      assertionVisitor.enter(controller);

      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterArgument(controller);
    });

    it('#isCapturingArgument returns true', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), true);
    });
    it('currentModification appears', () => {
      assert(assertionVisitor.currentModification !== undefined);
    });
    it('#isLeavingArgument returns true', () => {
      assert.equal(assertionVisitor.isLeavingArgument(controller), true);
    });
    it('#isModified returns false', () => {
      assert.equal(assertionVisitor.isModified(), false);
    });
  });

  describe('after #leaveArgument', () => {
    let controller;
    let resultNode;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      };
      assertionVisitor.enter(controller);

      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterArgument(controller);

      controller = {
        // parents: () => [callexp, expstmt, program],
        parents: () => [callexp],
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      resultNode = assertionVisitor.leaveArgument(controller);
    });

    it('#isCapturingArgument returns false', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), false);
    });
    it('currentModification disappears', () => {
      assert(assertionVisitor.currentModification === null);
    });
    it('#isLeavingArgument returns undefined', () => {
      assert.equal(assertionVisitor.isLeavingArgument(controller), undefined);
    });
    it('#isModified returns true', () => {
      assert.equal(assertionVisitor.isModified(), true);
    });

    describe('resultNode of leaveArgument', () => {
      // _arg1._rec(truthy, 'arguments/0', 10)
      it('its type', () => {
        assert.equal(resultNode.type, 'CallExpression');
      });
      it('its callee', () => {
        // _arg1._rec
        const callee = resultNode.callee;
        assert.equal(callee.type, 'MemberExpression');
        assert.equal(callee.object.type, 'Identifier');
        assert.equal(callee.object.name, '_arg1');
        assert.equal(callee.property.type, 'Identifier');
        assert.equal(callee.property.name, '_rec');
      });
      it('its arguments', () => {
        // (truthy, 'arguments/0', 10)
        const args = resultNode.arguments;
        assert.equal(args.length, 3);
        assert.equal(args[0], controller.current());
        assert.equal(args[1].type, 'Literal');
        assert.equal(args[1].value, 'arguments/0');
        assert.equal(args[2].type, 'Literal');
        assert.equal(args[2].value, 10);
      });
    });
  });

  describe('after #leave', () => {
    let controller;
    let resultNode;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      };
      assertionVisitor.enter(controller);

      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterArgument(controller);

      controller = {
        // parents: () => [callexp, expstmt, program],
        parents: () => [callexp],
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.leaveArgument(controller);

      controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      };
      resultNode = assertionVisitor.leave(controller);
    });

    it('reset argumentModifications', () => {
      assert.deepEqual(assertionVisitor.argumentModifications, []);
    });
    it('#isModified returns false after #leave', () => {
      assert.equal(assertionVisitor.isModified(), false);
    });

    describe('resultNode of leave', () => {
      it('its type', () => {
        assert.equal(resultNode.type, 'CallExpression');
      });
      it('its callee', () => {
        const callee = resultNode.callee;
        assert.equal(callee.type, 'MemberExpression');
        assert.equal(callee.object.type, 'Identifier');
        assert.equal(callee.object.name, '_asrt1');
        assert.equal(callee.property.type, 'Identifier');
        assert.equal(callee.property.name, 'run');
      });
      it('its arguments', () => {
        const args = resultNode.arguments;
        assert.equal(args.length, 1);
      });
    });
  });

});
