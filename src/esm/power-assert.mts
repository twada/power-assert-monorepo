import { strict as assert } from 'node:assert';
import { transpile } from './transpile-with-sourcemap.mjs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ModuleFormat,
  LoadHookContext,
  LoadFnOutput,
  NextLoadFn,
  ResolveHookContext,
  ResolveFnOutput,
  NextResolveFn,
  ModuleMatchResult
} from './types.mjs';

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

// eslint-disable-next-line no-useless-escape
const extPattern = /\/.+\.(m)?[jt]{1}s$/;
export function hasModuleExt (url: string): boolean {
  const m = extPattern.exec(url);
  return m !== null && m[1] === 'm';
}

export async function resolve(specifier: string, context: ResolveHookContext, nextResolve: NextResolveFn): Promise<ResolveFnOutput> {
  console.log(`######### resolve called ${specifier}`);
  // console.log(context);
  // assert.deepEqual({}, context);
  const { parentURL = null } = context;
  if (parentURL === null) {
    // 1: Any files explicitly provided by the user are executed.
    console.log(context);
    const url = new URL(specifier).href;
    const isModuleExt = hasModuleExt(url);
    const format = isModuleExt ? 'module' : await detectPackageType(url);
    return {
      format,
      shortCircuit: true,
      importAssertions: {
        ...context.importAssertions,
        'power-assert': true,
      },
      url: new URL(specifier).href,
    };
    // return nextResolve(specifier, {
    //   ...context,
    //   importAssertions: {
    //     ...context.importAssertions,
    //     'power-assert': true,
    //   },
    //   conditions: [...context.conditions, 'another-condition'],
    // });
  } else {
    return nextResolve(specifier, context);
  }
}


const supportedModuleFormats = ['builtin', 'commonjs', 'json', 'module', 'wasm'];

function assertModuleFormat (format: string): asserts format is ModuleFormat {
  // 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
  assert(supportedModuleFormats.includes(format), `Expected format to be one of ${supportedModuleFormats.join(', ')}, but got ${format}`);
}

async function detectPackageType (url: string): Promise<ModuleFormat | null> {
  const maybeType = await getPackageType(url);
  if (maybeType === false) {
    return null;
  } else {
    assertModuleFormat(maybeType);
    return maybeType;
  }
}

// start borrowing from https://nodejs.org/api/esm.html#transpiler-loader
async function getPackageType (url: string): Promise<string | false> {
  // `url` is only a file path during the first iteration when passed the
  // resolved url from the load() hook
  // an actual file path from load() will contain a file extension as it's
  // required by the spec
  // this simple truthy check for whether `url` contains a file extension will
  // work for most projects but does not cover some edge-cases (such as
  // extensionless files or a url ending in a trailing space)
  const isFilePath = !!extname(url);
  // If it is a file path, get the directory it's in
  const dir = isFilePath ?
    dirname(fileURLToPath(url)) :
    url;
  // Compose a file path to a package.json in the same directory,
  // which may or may not exist
  const packagePath = resolvePath(dir, 'package.json');
  // Try to read the possibly nonexistent package.json
  const type = await readFile(packagePath, { encoding: 'utf8' })
    .then((filestring) => JSON.parse(filestring).type)
    .catch((err) => {
      if (err?.code !== 'ENOENT') console.error(err);
    });
  // Ff package.json existed and contained a `type` field with a value, voila
  if (type) return type;
  // Otherwise, (if not at the root) continue checking the next directory up
  // If at the root, stop and return false
  return dir.length > 1 && getPackageType(resolvePath(dir, '..'));
} 
// end borrowing from https://nodejs.org/api/esm.html#transpiler-loader

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
  const { format, importAssertions } = context;
  if (format !== 'module') {
    // console.log(context);
    // console.log(`######### format !== 'module' => ${format}`);
    return nextLoad(url);
  }
  // const [isTarget, hasModuleExt] = matchUrl(url);


  // TODO: Any files explicitly provided by the user are executed.

  // node_modules directories are skipped unless explicitly provided by the user.

  // TODO: If a directory named test is encountered, the test runner will search it recursively for all all .js, .cjs, and .mjs files. All of these files are treated as test files, and do not need to match the specific naming convention detailed below. This is to accommodate projects that place all of their tests in a single test directory.


  if (importAssertions !== undefined && importAssertions['power-assert'] === true) {
  // if (isTarget) {
    console.log(`######### MATCH ${url}`);
    console.log(context);

    // let format: ModuleFormat;
    // if (hasModuleExt) {
    //   // url ends with .mjs or .mts
    //   format = 'module';
    // } else {


    //   // url ends with .js or .ts
    //   // TODO: detect format from package.json


    //   console.log(`######### cannot detect format('commonjs' or 'module') from ${url}`);
    //   return nextLoad(url);
    // }
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
