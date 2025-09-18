import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { powerAssert } from '../rollup-plugin-power-assert.mts';
import type { RollupBuild } from 'rollup';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('rollup-plugin-power-assert', () => {
  const options = {
    plugins: [
      powerAssert()
    ]
  };
  let bundle: RollupBuild;

  describe('node:assert', () => {
    beforeEach(async () => {
      const exampleFilepath = resolve(__dirname, '..', '..', 'fixtures', 'node_assert.mjs');
      bundle = await rollup({
        input: exampleFilepath,
        logLevel: 'silent',
        ...options
      });
    });

    it('transforms code', async () => {
      const { output } = await bundle.generate({ format: 'es' });
      assert(output.length === 1);
      assert.match(output[0].code, /import \{ _power_ \} from '@power-assert\/runtime';/);
    });
  });

  describe('vitest', () => {
    beforeEach(async () => {
      const exampleFilepath = resolve(__dirname, '..', '..', 'fixtures', 'vitest.mjs');
      bundle = await rollup({
        input: exampleFilepath,
        logLevel: 'silent',
        ...options
      });
    });

    it('transforms code', async () => {
      const { output } = await bundle.generate({ format: 'es' });
      assert(output.length === 1);
      assert.match(output[0].code, /import \{ _power_ \} from '@power-assert\/runtime';/);
    });
  });
});
