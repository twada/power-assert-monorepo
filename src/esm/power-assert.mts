import { strict as assert } from 'node:assert';
import { transpile } from './transpile-with-sourcemap.mjs';

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


  // TODO: Any files explicitly provided by the user are executed.

  // node_modules directories are skipped unless explicitly provided by the user.

  // TODO: If a directory named test is encountered, the test runner will search it recursively for all all .js, .cjs, and .mjs files. All of these files are treated as test files, and do not need to match the specific naming convention detailed below. This is to accommodate projects that place all of their tests in a single test directory.


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
