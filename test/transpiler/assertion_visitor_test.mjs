import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AssertionVisitor } from '../../dist/src/transpiler/assertion-visitor.mjs';
import { parseExpressionAt } from 'acorn';

describe('AssertionVisitor', () => {
  let assertionVisitor;
  let callexp;
  const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.ok(truthy);
`;

  beforeEach(() => {
    const options = {
      sourceType: 'module',
      ecmaVersion: '2022',
      locations: true,
      ranges: true,
      sourceFile: '/path/to/source.mjs'
    };
    callexp = parseExpressionAt(code, code.lastIndexOf('assert.ok'), options);

    const stubTransformation = {
      insertDeclIntoCurrentBlock: (controller, decl) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        // do nothing
      },
      generateUniqueName: (str) => `_p${str}1`
    };
    const decoratorFunctionIdent = {
      type: 'Identifier',
      name: '_power_'
    };

    const firstController = {
      path: () => ['body', 2, 'expression'],
      current: () => callexp
    };
    assertionVisitor = new AssertionVisitor(
      firstController,
      stubTransformation,
      decoratorFunctionIdent,
      code
    );
  });

  describe('after #constructor', () => {
    it('assertionCode is generated', () => {
      assert.equal(assertionVisitor.assertionCode, 'assert.ok(truthy)');
    });

    it('poweredAssertIdent is generated', () => {
      assert(assertionVisitor.poweredAssertIdent !== undefined);
      const pwIdent = assertionVisitor.poweredAssertIdent;
      assert.equal(pwIdent.type, 'Identifier');
      assert.equal(pwIdent.name, '_pasrt1');
    });

    it('#isCapturingArgument returns false', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), false);
    });
  });

  describe('after #enterArgument', () => {
    let controller;

    beforeEach(() => {
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
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterArgument(controller);

      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterNodeToBeCaptured(controller);

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
      assert.equal(assertionVisitor.isLeavingArgument(controller), false);
    });
    it('#isModified returns true', () => {
      assert.equal(assertionVisitor.isModified(), true);
    });

    describe('resultNode of leaveArgument', () => {
      // _parg1._rec(truthy, 'arguments/0', 10)
      it('its type', () => {
        assert.equal(resultNode.type, 'CallExpression');
      });
      it('its callee', () => {
        // _parg1._rec
        const callee = resultNode.callee;
        assert.equal(callee.type, 'MemberExpression');
        assert.equal(callee.object.type, 'Identifier');
        assert.equal(callee.object.name, '_parg1');
        assert.equal(callee.property.type, 'Identifier');
        assert.equal(callee.property.name, 'rec');
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
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterArgument(controller);

      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      };
      assertionVisitor.enterNodeToBeCaptured(controller);

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
        assert.equal(callee.object.name, '_pasrt1');
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
