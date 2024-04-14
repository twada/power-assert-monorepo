import { transpileWithSeparatedSourceMap } from '@power-assert/transpiler';
import { pathToFileURL } from 'node:url';
import type { Plugin, TransformResult } from 'rollup';
import { createFilter } from '@rollup/pluginutils';
import type { FilterPattern } from '@rollup/pluginutils';

export type PowerAssertPluginOptions = {
  include?: FilterPattern;
  exclude?: FilterPattern;
};

export function powerAssertPlugin (options: PowerAssertPluginOptions = {}): Plugin {
  const filter = createFilter(options.include, options.exclude);
  return {
    name: 'power-assert',
    async transform (src: string, id: string): Promise<TransformResult> {
      if (!filter(id)) {
        return;
      }
      const transpiled = await transpileWithSeparatedSourceMap(src, {
        file: pathToFileURL(id).toString(),
        modules: [
          { source: 'vitest', imported: ['assert'] }
        ]
      });
      return {
        code: transpiled.code,
        map: transpiled.sourceMap
      };
    }
  };
}
