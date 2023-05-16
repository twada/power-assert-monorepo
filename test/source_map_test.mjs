/* eslint @typescript-eslint/no-unused-vars: 0 */
/* eslint no-unused-vars: 0 */
/* eslint no-eval: 0 */
import { test } from 'node:test';
import assert from 'node:assert/strict'; // variable 'assert' is referenced in eval
import { _power_ } from '../dist/runtime/runtime.mjs'; // variable '_power_' is referenced in eval
import { espowerAst } from '../dist/transpiler/transpiler.mjs';
import { parse } from 'acorn';
import { generate } from 'astring';
import { SourceMapGenerator, SourceMapConsumer } from 'source-map';
import { fromJSON, fromSource } from 'convert-source-map';

function transpile (code) {
  const ast = parse(code, {
    sourceType: 'module',
    ecmaVersion: '2022',
    locations: true,
    ranges: true
  });
  const poweredAst = espowerAst(ast, {
    variables: [
    // set variable name explicitly for testing
      'assert'
    ],
    // runtime: '../dist/runtime/runtime.mjs',
    code
  });
  const smg = new SourceMapGenerator({
    file: 'source.mjs'
  });
  const transpiledCode = generate(poweredAst, {
    sourceMap: smg
  });
  const outMap = fromJSON(smg.toString());
  return transpiledCode + '\n' + outMap.toComment() + '\n';
}

function isAssertionError (e) {
  return e instanceof Error && /^AssertionError/.test(e.name);
}

test('SourceMap support', async () => {
  const code = `
    const truthy = true;
    const falsy = false;
    assert(truthy === falsy);
`;
  const transpiledCode = transpile(code);
  const map = fromSource(transpiledCode).toObject();
  const lines = transpiledCode.split('\n');
  lines[0] = "//port { _power_ } from '@power-assert/runtime';";
  const evalTargetCode = lines.join('\n');
  console.log(evalTargetCode);
  // //port { _power_ } from '@power-assert/runtime';
  // const _pasrt1 = _power_(assert, null, "assert(truthy === falsy)", {
  //   binexp:
  // });
  // const _parg1 = _pasrt1.recorder(0);
  // const truthy = true;
  // const falsy = false;
  // _pasrt1.run(_parg1.rec(_parg1.tap(truthy, "arguments/0/left", 7) === _parg1.tap(falsy, "arguments/0/right", 18), "arguments/0", 14));
  try {
    eval(evalTargetCode);
    throw new Error('AssertionError should be thrown');
  } catch (e) {
    if (!isAssertionError(e)) {
      throw e;
    } else {
      const theLine = e.stack.split('\n').find((line) => line.startsWith('    at eval'));
      const result = theLine.match(/eval at <anonymous> \((.+)\), <anonymous>:(\d+):(\d+)\)/);
      result.shift();
      const [_file, line, column] = result;
      assert.equal(line, '8');
      assert.equal(column, '9');
      const consumer = await new SourceMapConsumer(map);
      const originalPosition = consumer.originalPositionFor({
        line: Number(line),
        column: Number(column)
      });
      assert.equal(originalPosition.source, 'source.mjs');
      assert.equal(originalPosition.line, 4);
      assert.equal(originalPosition.column, 4);
    }
  }
});
