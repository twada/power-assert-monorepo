import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { AssertionVisitor, extractArea } from '../assertion-visitor.mjs';
import { parseExpressionAt } from 'acorn';
import type { Options as AcornOptions } from 'acorn';

import type { Controller } from 'estraverse';
import type { Node, CallExpression, Identifier, ImportDeclaration, VariableDeclaration } from 'estree';
import type { Transformation } from '../transformation.mjs';

describe('extractArea', () => {
  it('single line assertion', () => {
    const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.ok(truthy);
`;
    const result = extractArea(code, { line: 4, column: 0 }, { line: 4, column: 17 });
    assert.equal(result, 'assert.ok(truthy)');
  });

  it('multi line assertion', () => {
    const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.equal(truthy,
             1);
`;
    const result = extractArea(code, { line: 4, column: 0 }, { line: 5, column: 15 });
    assert.equal(result, 'assert.equal(truthy,\n             1)');
  });

  it('assertion more than 2 lines', () => {
    const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.equal(truthy,
             1,
             'message');
`;
    const result = extractArea(code, { line: 4, column: 0 }, { line: 6, column: 23 });
    assert.equal(result, 'assert.equal(truthy,\n             1,\n             \'message\')');
  });
});

describe('AssertionVisitor', () => {
  let assertionVisitor: AssertionVisitor;
  let callexp: CallExpression;
  const code = `
import assert from 'node:assert/strict';
const truthy = 1;
assert.ok(truthy);
`;

  beforeEach(() => {
    const options: AcornOptions = {
      sourceType: 'module',
      ecmaVersion: 13,
      locations: false,
      ranges: false,
      sourceFile: '/path/to/source.mjs'
    };
    callexp = parseExpressionAt(code, code.lastIndexOf('assert.ok'), options) as Node as CallExpression;

    const stubTransformation: Transformation = {
      insertDeclIntoCurrentBlock: (decl: ImportDeclaration | VariableDeclaration) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        // do nothing
      },
      generateUniqueName: (name: string) => `_p${name}1`
    } as Transformation;
    const decoratorFunctionIdent: Identifier = {
      type: 'Identifier',
      name: '_power_'
    };

    const firstController: Controller = {
      path: () => ['body', 2, 'expression'],
      current: () => callexp
    } as Controller;
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
    let controller: Controller;
    let currentNode: Node;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      } as Controller;
      currentNode = callexp.arguments[0];
      assertionVisitor.enterArgument(controller);
    });

    it('#isCapturingArgument returns true', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), true);
    });
    it('currentModification appears', () => {
      assert(assertionVisitor.currentModification !== undefined);
    });
    it('#isLeavingArgument returns true', () => {
      assert.equal(assertionVisitor.isLeavingArgument(currentNode), true);
    });
    it('#isModified returns false', () => {
      assert.equal(assertionVisitor.isModified(), false);
    });
  });

  describe('after #leaveArgument', () => {
    let controller: Controller;
    let resultNode: CallExpression;
    let currentNode: Node;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      } as Controller;
      assertionVisitor.enterArgument(controller);

      // controller = {
      //   path: () => ['body', 2, 'expression', 'arguments', 0],
      //   current: () => callexp.arguments[0]
      // } as Controller;
      assertionVisitor.enterNodeToBeCaptured(callexp.arguments[0]);

      controller = {
        // parents: () => [callexp, expstmt, program],
        parents: () => [callexp],
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      } as Controller;
      currentNode = callexp.arguments[0];
      resultNode = assertionVisitor.leaveArgument(controller) as CallExpression;
    });

    it('#isCapturingArgument returns false', () => {
      assert.equal(assertionVisitor.isCapturingArgument(), false);
    });
    it('currentModification disappears', () => {
      assert(assertionVisitor.currentModification === null);
    });
    it('#isLeavingArgument returns undefined', () => {
      assert.equal(assertionVisitor.isLeavingArgument(currentNode), false);
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
    let controller: Controller;
    let resultNode: CallExpression;

    beforeEach(() => {
      controller = {
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      } as Controller;
      assertionVisitor.enterArgument(controller);

      // controller = {
      //   path: () => ['body', 2, 'expression', 'arguments', 0],
      //   current: () => callexp.arguments[0]
      // } as Controller;
      assertionVisitor.enterNodeToBeCaptured(callexp.arguments[0]);

      controller = {
        // parents: () => [callexp, expstmt, program],
        parents: () => [callexp],
        path: () => ['body', 2, 'expression', 'arguments', 0],
        current: () => callexp.arguments[0]
      } as Controller;
      assertionVisitor.leaveArgument(controller);

      controller = {
        path: () => ['body', 2, 'expression'],
        current: () => callexp
      } as Controller;
      resultNode = assertionVisitor.leave(controller) as CallExpression;
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
