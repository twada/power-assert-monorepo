import { parse } from 'acorn';
import { espowerAst } from '@power-assert/transpiler-core/src/transpiler-core.mjs';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { fromJSON, fromObject, fromMapFileSource, fromSource } from 'convert-source-map';
import { transfer } from 'multi-stage-sourcemap';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Node } from 'estree';
import type { SourceMapConverter } from 'convert-source-map';

export type TranspileWithSourceMapOptions = {
  file?: string,
  runtime?: string,
  modules?: string[],
  variables?: string[]
};

type CodeWithSeparatedSourceMap = {
  type: 'CodeWithSeparatedSourceMap',
  code: string,
  sourceMap: string
};

type CodeWithInlineSourceMap = {
  type: 'CodeWithInlineSourceMap',
  code: string
};

export async function transpileWithSeparatedSourceMap (code: string, options?: TranspileWithSourceMapOptions): Promise<CodeWithSeparatedSourceMap> {
  const { transpiledCode, outMapConv } = await transpile(code, options);
  return {
    type: 'CodeWithSeparatedSourceMap',
    code: transpiledCode,
    sourceMap: outMapConv.toJSON()
  };
}

export async function transpileWithInlineSourceMap (code: string, options?: TranspileWithSourceMapOptions): Promise<CodeWithInlineSourceMap> {
  const { transpiledCode, outMapConv } = await transpile(code, options);
  return {
    type: 'CodeWithInlineSourceMap',
    code: transpiledCode + '\n' + outMapConv.toComment() + '\n'
  };
}

type CodeWithSourceMapConverter = {
  type: 'CodeWithSourceMapConverter',
  transpiledCode: string,
  outMapConv: SourceMapConverter
};

async function transpile (code: string, options?: TranspileWithSourceMapOptions): Promise<CodeWithSourceMapConverter> {
  const mine = {
    runtime: 'espower3/runtime',
    code
  };
  const config = { ...mine, ...options };

  const ast: Node = parse(code, {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true, // true for SourceMap
    ranges: false,
    sourceFile: config.file
  }) as Node;
  const modifiedAst = espowerAst(ast, config);
  const smg = new SourceMapGenerator({
    file: config.file
  });
  const transpiledCode = generate(modifiedAst, {
    sourceMap: smg
  });

  let outMapConv = fromObject(smg.toJSON());
  const inMapConv = await findIncomingSourceMap(code, config.file);
  if (inMapConv) {
    outMapConv = reconnectSourceMap(inMapConv, outMapConv);
  }

  return {
    type: 'CodeWithSourceMapConverter',
    transpiledCode,
    outMapConv
  };
}

async function findIncomingSourceMap (originalCode: string, fileUrlOrPath?: string): Promise<SourceMapConverter | null> {
  if (!fileUrlOrPath) {
    // inline sourceMap or no sourceMap
    return fromSource(originalCode);
  }
  const sourceMappingURL = retrieveSourceMapURL(originalCode);
  // //# sourceMappingURL=foo.js.map or /*# sourceMappingURL=foo.js.map */
  if (sourceMappingURL && !/^data:application\/json[^,]+base64,/.test(sourceMappingURL)) {
    // relative file sourceMap
    return await fromMapFileSource(originalCode, (filename: string) => {
      // resolve relative path
      const nativePath = URL.canParse(fileUrlOrPath) ? fileURLToPath(fileUrlOrPath) : fileUrlOrPath;
      return readFile(resolve(nativePath, '..', filename), 'utf8');
    });
  } else {
    // inline sourceMap or no sourceMap
    return fromSource(originalCode);
  }
}

// copy from https://github.com/evanw/node-source-map-support/blob/master/source-map-support.js#L99
function retrieveSourceMapURL (source: string): string | null {
  //        //# sourceMappingURL=foo.js.map                       /*# sourceMappingURL=foo.js.map */
  // eslint-disable-next-line no-useless-escape
  const re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/mg;
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  let lastMatch, match;
  // eslint-disable-next-line no-cond-assign
  while (match = re.exec(source)) {
    lastMatch = match;
  }
  if (!lastMatch) {
    return null;
  }
  return lastMatch[1];
}

function mergeSourceMap (incomingSourceMapConv: SourceMapConverter, outgoingSourceMapConv: SourceMapConverter): SourceMapConverter {
  return fromJSON(transfer({ fromSourceMap: outgoingSourceMapConv.toObject(), toSourceMap: incomingSourceMapConv.toObject() }));
}

function copyPropertyIfExists (name: string, from: SourceMapConverter, to: SourceMapConverter): void {
  if (from.getProperty(name)) {
    to.setProperty(name, from.getProperty(name));
  }
}

function reconnectSourceMap (inMap: SourceMapConverter, outMap: SourceMapConverter): SourceMapConverter {
  const reMap = mergeSourceMap(inMap, outMap);
  copyPropertyIfExists('sources', inMap, reMap);
  copyPropertyIfExists('sourceRoot', inMap, reMap);
  copyPropertyIfExists('sourcesContent', inMap, reMap);
  return reMap;
}
