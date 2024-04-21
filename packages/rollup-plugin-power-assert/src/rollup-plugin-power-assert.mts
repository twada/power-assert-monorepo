import { transpileWithSeparatedSourceMap } from '@power-assert/transpiler';
import { defaultOptions } from '@power-assert/transpiler-core';
import { createFilter } from '@rollup/pluginutils';
import type { Plugin, TransformResult, TransformPluginContext } from 'rollup';
import type { FilterPattern } from '@rollup/pluginutils';
import type { TargetImportSpecifier } from '@power-assert/transpiler-core';

export type PowerAssertPluginOptions = {
  include?: FilterPattern;
  exclude?: FilterPattern;
  modules?: (string | TargetImportSpecifier)[],
};

export function powerAssertPlugin (options: PowerAssertPluginOptions = {}): Plugin {
  const filter = createFilter(options.include, options.exclude);
  return {
    name: 'power-assert',
    async transform (this: TransformPluginContext, code: string, id: string): Promise<TransformResult> {
      if (!filter(id)) {
        return;
      }
      const modules = options.modules ?? defaultOptions().modules.concat([{ source: 'vitest', imported: ['assert'] }]);
      const transpiled = await transpileWithSeparatedSourceMap(code, {
        file: id,
        modules
      });
      return {
        code: transpiled.code,
        map: transpiled.sourceMap
      };
    }
  };
}
