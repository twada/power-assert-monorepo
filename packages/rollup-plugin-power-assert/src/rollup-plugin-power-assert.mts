import { parseAst } from 'rollup/parseAst';
import { espowerAst, defaultOptions } from '@power-assert/transpiler-core';
// import { pathToFileURL } from 'node:url';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import type { Plugin, TransformResult, TransformPluginContext } from 'rollup';
// import type { ProgramNode } from 'rollup';
import type { Node } from 'estree';
import { createFilter } from '@rollup/pluginutils';
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
        this.warn(`not target: ${id}`);
        return;
      }
      this.warn(`is target: ${id}`);
      // this.warn(id);
      // this.getModuleInfo(id)?.ast
      const ast = parseAst(code) as Node;
      // this.warn(JSON.stringify(ast, null, 2));
      const modules = options.modules ?? defaultOptions().modules;
      const modifiedAst = espowerAst(ast, code, {
        modules
        // variables: ['assert']
      });
      // const url = pathToFileURL(id).toString();
      const url = id;
      const smg = new SourceMapGenerator({
        file: url
      });
      const transpiledCode = generate(modifiedAst, {
        sourceMap: smg
      });
      // this.warn(transpiledCode);
      return {
        code: transpiledCode,
        // ast: modifiedAst as ProgramNode,
        // [!] Error: Character is out of bounds
        // at MagicString.remove (./node_modules/rollup/dist/shared/rollup.js:2500:54)
        // at Program.parseNode (./node_modules/rollup/dist/shared/rollup.js:6116:50)
        // at new NodeBase (./node_modules/rollup/dist/shared/rollup.js:6022:14)
        // at new Program (./node_modules/rollup/dist/shared/rollup.js:12159:9)
        // at Module.setSource (./node_modules/rollup/dist/shared/rollup.js:14267:20)
        // at ModuleLoader.addModuleSource (./node_modules/rollup/dist/shared/rollup.js:18485:20)
        map: smg.toJSON()
      };
    }
  };
}
