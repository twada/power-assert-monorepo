import { transpileWithSeparatedSourceMap } from '@power-assert/transpiler';
import { pathToFileURL } from 'node:url';
import type { Plugin, TransformResult } from 'rollup';

export function powerAssertPlugin (): Plugin {
  return {
    name: 'power-assert',
    async transform (src: string, id: string): Promise<TransformResult> {
      if (id.endsWith('.test.mts') || id.endsWith('.test.mjs')) {
        console.log(id);
        const transpiled = await transpileWithSeparatedSourceMap(src, {
          file: pathToFileURL(id).toString()
        });
        return {
          code: transpiled.code,
          map: transpiled.sourceMap
        };
      }
    }
  };
}
