import { readFile } from 'node:fs/promises';
// import { pathToFileURL } from 'node:url';
import { relative } from 'node:path';
import { transpileWithInlineSourceMap } from '@power-assert/transpiler';
import type { Plugin, PluginBuild, OnLoadArgs, OnLoadResult } from 'esbuild';

type OnLoadCallback = (args: OnLoadArgs) => (OnLoadResult | null | undefined | Promise<OnLoadResult | null | undefined>);

export function powerAssertPlugin (): Plugin {
  return {
    name: 'power-assert',
    setup (build: PluginBuild): (void | Promise<void>) {
      const callback: OnLoadCallback = async (args: OnLoadArgs) => {
        // console.log(args.path);
        const source = await readFile(args.path, 'utf8');
        const filename = relative(process.cwd(), args.path);
        const transpiled = await transpileWithInlineSourceMap(source, {
          file: filename
          // file: pathToFileURL(args.path).toString(),
          // modules: ['node:assert/strict']
        });
        // console.log(transpiled.code);
        return {
          pluginName: 'power-assert',
          contents: transpiled.code,
          loader: 'js'
        };
      };
      build.onLoad({ filter: /\.test\.m?js$/ }, callback);
    }
  };
}
