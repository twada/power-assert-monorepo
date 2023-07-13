import { parse } from 'acorn';
import { espowerAst } from '../transpiler/transpiler.mjs';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { SourceMapConverter, fromJSON, fromObject, fromMapFileSource, fromSource } from 'convert-source-map';
import { transfer } from 'multi-stage-sourcemap';
import { strict as assert } from 'node:assert';
import type { Node } from 'estree';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// start borrowing from https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65490
type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
type ModuleSource = string | ArrayBuffer | NodeJS.TypedArray;
interface LoadHookContext {
  /**
   * Export conditions of the relevant `package.json`
   */
  conditions: string[];
  /**
   * The format optionally supplied by the `resolve` hook chain
   */
  format: ModuleFormat;
  /**
   *  An object whose key-value pairs represent the assertions for the module to import
   */
  importAssertions?: { type?: 'json' };
}
interface LoadFnOutput {
  format: ModuleFormat;
  /**
   * A signal that this hook intends to terminate the chain of `resolve` hooks.
   * @default false
   */
  shortCircuit?: boolean | undefined;
  /**
   * The source for Node.js to evaluate
   */
  source?: ModuleSource;
}
// end borrowing from https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65490

type NextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput;
type ModuleMatchResult = readonly [boolean, boolean];

// eslint-disable-next-line no-useless-escape
const targetPattern = /\/test\.(m)?[jt]{1}s$|\/test-.+\.(m)?[jt]{1}s$|\/.+[\.\-\_]test\.(m)?[jt]{1}s$/;
// const targetPattern = /\/test\.(m)?[jt]{1}s$|\/test[\.\-\_].+\.(m)?[jt]{1}s$|\/.+[\.\-\_]test\.(m)?[jt]{1}s$/;

export function matchUrl (url: string): ModuleMatchResult {
  const m = targetPattern.exec(url);
  if (m === null) {
    return [false, false];
  }
  return [true, (m[1] === 'm' || m[2] === 'm' || m[3] === 'm')];
}

/**
 * The `load` hook provides a way to define a custom method of determining how a URL should be interpreted, retrieved, and parsed.
 * It is also in charge of validating the import assertion.
 *
 * @param url The URL/path of the module to be loaded
 * @param context Metadata about the module
 * @param nextLoad The subsequent `load` hook in the chain, or the Node.js default `load` hook after the last user-supplied `load` hook
 */
export async function load (url: string, context: LoadHookContext, nextLoad: NextLoadFn): Promise<LoadFnOutput> {
  console.log(`######### called ${url}`);
  // const { format } = context;
  // if (format !== 'module') {
  //   console.log(context);
  //   console.log(`######### format !== 'module' => ${format}`);
  //   return nextLoad(url);
  // }
  const [isTarget, hasModuleExt] = matchUrl(url);
  if (isTarget) {
    console.log(`######### MATCH ${url}`);
    let format: ModuleFormat;
    if (hasModuleExt) {
      // url ends with .mjs or .mts
      format = 'module';
    } else {


      // url ends with .js or .ts
      // TODO: detect format from package.json


      console.log(`######### cannot detect format('commonjs' or 'module') from ${url}`);
      return nextLoad(url);
    }
    const { source: rawSource } = await nextLoad(url, { ...context, format });
    assert(rawSource !== undefined, 'rawSource should not be undefined');
    const incomingCode = rawSource.toString();
    console.log(`######### incomingCode: ${incomingCode}`);
    const transpiledCode = await transpile(incomingCode, url);
    console.log(`######### transpiledCode: ${transpiledCode}`);
    // console.log(transpiledCode);
    return {
      format,
      source: transpiledCode
    };
  } else {
    console.log(`######### does not match ${url}`);
  }
  return nextLoad(url);
}

async function transpile (code: string, url: string): Promise<string> {
  const ast: Node = parse(code, {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true,
    ranges: true,
    sourceFile: url
  }) as Node;
  const modifiedAst = espowerAst(ast, {
    runtime: 'espower3/runtime',
    code
  });
  const smg = new SourceMapGenerator({
    file: url
  });
  const transpiledCode = generate(modifiedAst, {
    sourceMap: smg
  });

  let outMapConv = fromObject(smg.toJSON());
  const inMapConv = await findIncomingSourceMap(code, url);
  if (inMapConv) {
    console.log(inMapConv.toObject());
    outMapConv = reconnectSourceMap(inMapConv, outMapConv);
    console.log('######### reconnected @@@@@@@@@@@@@');
  }

  return transpiledCode + '\n' + outMapConv.toComment() + '\n';
}

async function findIncomingSourceMap (originalCode: string, url: string): Promise<SourceMapConverter | null> {
  const sourceMappingURL = retrieveSourceMapURL(originalCode);
  const nativePath = fileURLToPath(url);
  // //# sourceMappingURL=foo.js.map or /*# sourceMappingURL=foo.js.map */
  if (sourceMappingURL && !/^data:application\/json[^,]+base64,/.test(sourceMappingURL)) {
    // relative file sourceMap
    return await fromMapFileSource(originalCode, (filename: string) => {
      // resolve relative path
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
