import * as esbuild from 'esbuild';
import { powerAssertPlugin } from 'esbuild-plugin-power-assert';

await esbuild.build({
  entryPoints: ['examples/bowling.test.mjs'],
  // bundle: true,
  // platform: 'node',
  format: 'esm',
  packages: 'external',
  sourcemap: 'inline',
  // outfile: 'out.js',
  outdir: 'tmp',
  plugins: [powerAssertPlugin()],
});
