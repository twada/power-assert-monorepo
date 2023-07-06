import { parse } from 'acorn';
import { espowerAst } from '../transpiler/transpiler.mjs';
import { generate } from 'astring';
import { SourceMapGenerator } from 'source-map';
import { SourceMapConverter, fromJSON, fromMapFileSource, fromSource } from 'convert-source-map';
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
  importAssertions: Object;
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

type NextLoadFn =  (url: string, context?: LoadHookContext) => LoadFnOutput;

const targetPattern = /^test\.(:?m)js$|^test-.+\.(:?m)js|.+[\.\-\_]test\.(:?m)js$/;

/**
 * The `load` hook provides a way to define a custom method of determining how a URL should be interpreted, retrieved, and parsed.
 * It is also in charge of validating the import assertion.
 *
 * @param url The URL/path of the module to be loaded
 * @param context Metadata about the module
 * @param nextLoad The subsequent `load` hook in the chain, or the Node.js default `load` hook after the last user-supplied `load` hook
 */
export async function load(url: string, context: LoadHookContext, nextLoad: NextLoadFn): Promise<LoadFnOutput> {
  const { format } = context;
  if (format !== 'module') {
    return nextLoad(url);
  }
  if (targetPattern.test(url)) {
    const { source: rawSource } = await nextLoad(url, { ...context, format });
    assert(rawSource !== undefined, 'rawSource should not be undefined');
    const incomingCode = rawSource.toString();
    const incomingSourceMap = await handleIncomingSourceMap(incomingCode, url);
    if (incomingSourceMap) {
      console.log(incomingSourceMap);
    }
    const transpiledCode = transpile(incomingCode, url);
    // console.log(transpiledCode);
    return {
      format,
      source: transpiledCode,
    };
  }
  return nextLoad(url);
}

function transpile (code: string, url: string): string {
  const ast: Node = parse(code, {
    sourceType: 'module',
    ecmaVersion: 2022,
    locations: true,
    ranges: true,
    sourceFile: url
  }) as Node;
  const modifiedAst = espowerAst(ast, {
    runtime: 'espower3/runtime',
    code: code
  });
  const smg = new SourceMapGenerator({
    file: url,
  });
  const transpiledCode = generate(modifiedAst, {
    sourceMap: smg,
  });
  const outMap = fromJSON(smg.toString());
  return transpiledCode + '\n' + outMap.toComment() + '\n';
}

async function handleIncomingSourceMap (originalCode: string, url: string): Promise<object | null> {
  const sourceMappingURL = retrieveSourceMapURL(originalCode);
  const nativePath = fileURLToPath(url);
  let commented: SourceMapConverter | null;
  // relative file sourceMap
  // //# sourceMappingURL=foo.js.map or /*# sourceMappingURL=foo.js.map */
  if (sourceMappingURL && !/^data:application\/json[^,]+base64,/.test(sourceMappingURL)) {
      commented = await fromMapFileSource(originalCode, (filename: string) => {  
        // resolve relative path
        return readFile(resolve(nativePath, '..', filename), 'utf8');
      });
  } else {
      // inline sourceMap or no sourceMap
      commented = fromSource(originalCode);
  }

  if (commented) {
    return commented.toObject();
  } else {
    return null;
  }
}

// copy from https://github.com/evanw/node-source-map-support/blob/master/source-map-support.js#L99
function retrieveSourceMapURL (source: string): string | null {
  //        //# sourceMappingURL=foo.js.map                       /*# sourceMappingURL=foo.js.map */
  var re = /(?:\/\/[@#][ \t]+sourceMappingURL=([^\s'"]+?)[ \t]*$)|(?:\/\*[@#][ \t]+sourceMappingURL=([^\*]+?)[ \t]*(?:\*\/)[ \t]*$)/mg;
  // Keep executing the search to find the *last* sourceMappingURL to avoid
  // picking up sourceMappingURLs from comments, strings, etc.
  var lastMatch, match;
  while (match = re.exec(source)) {
      lastMatch = match;
  }
  if (!lastMatch) {
      return null;
  }
  return lastMatch[1];
}
