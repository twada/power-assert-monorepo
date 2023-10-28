import * as esbuild from 'esbuild';
import { powerAssertPlugin } from './dist/power-assert-esbuild-plugin.mjs';

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
