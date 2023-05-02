import { promises as fs } from 'fs';
import { globSync } from 'glob';
import externals from 'rollup-plugin-node-externals';
import copy from 'rollup-plugin-copy';

export default {
  input: globSync('dist/**/*.mjs'),
  output: {
    dir: 'dist',
    format: 'cjs',
    entryFileNames: '[name].js',
    // entryFileNames: '[name].cjs',
    // create a module for each module in the input, instead of trying to chunk them together.
    preserveModules: true,
    // do not add `Object.defineProperty(exports, '__esModule', { value: true })`
    esModule: false,
    // use const instead of var when creating statements
    generatedCode : {
      constBindings: true
    }
  },
  plugins: [
    // https://github.com/Septh/rollup-plugin-node-externals
    externals({
      // strip 'node:' prefix
      builtinsPrefix: 'strip'
    }),
    // https://github.com/vladshcherbin/rollup-plugin-copy
    copy({
      targets: [
        // copy from .d.mts to .d.ts while removing the "node:" protocol
        {
          src: 'dist/**/*.d.mts',
          dest: 'dist/',
          rename: (name, extension, fullPath) => {
            // name => 'index.d', extension => 'mts', fullPath => 'dist/transpiler/index.d.mts' here
            return fullPath.replace(/^dist\//, '').replace(/\.d\.mts/, '.d.ts');
          },
          transform: (contents, filename) => contents.toString().replace('node:', '')
        }
      ]
    })
  ]
};
