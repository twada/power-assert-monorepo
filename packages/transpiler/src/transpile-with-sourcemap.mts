import { transpileWith } from './parse-unparse.mjs';
import { espowerAst } from '@power-assert/transpiler-core';
import type { Node } from 'estree';
import type { TargetImportSpecifier } from '@power-assert/transpiler-core';
import type { TranspileAstFunc } from './parse-unparse.mjs';

export type TranspileWithSourceMapOptions = {
  file?: string,
  runtime?: string,
  modules?: (string | TargetImportSpecifier)[],
  variables?: string[]
};

export type CodeWithSeparatedSourceMap = {
  type: 'CodeWithSeparatedSourceMap',
  code: string,
  sourceMap: string
};

export type CodeWithInlineSourceMap = {
  type: 'CodeWithInlineSourceMap',
  code: string
};

export async function transpileWithSeparatedSourceMap (code: string, options?: TranspileWithSourceMapOptions): Promise<CodeWithSeparatedSourceMap> {
  const transpile: TranspileAstFunc = (ast: Node, code: string) => espowerAst(ast, code, options);
  const { transpiledCode, outMapConv } = await transpileWith(transpile, code, options?.file);
  return {
    type: 'CodeWithSeparatedSourceMap',
    code: transpiledCode,
    sourceMap: outMapConv.toJSON()
  };
}

export async function transpileWithInlineSourceMap (code: string, options?: TranspileWithSourceMapOptions): Promise<CodeWithInlineSourceMap> {
  const transpile: TranspileAstFunc = (ast: Node, code: string) => espowerAst(ast, code, options);
  const { transpiledCode, outMapConv } = await transpileWith(transpile, code, options?.file);
  return {
    type: 'CodeWithInlineSourceMap',
    code: transpiledCode + '\n' + outMapConv.toComment() + '\n'
  };
}
