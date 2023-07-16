import { strict as assert } from 'node:assert';
import { transpile } from './transpile-with-sourcemap.mjs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  LoadHookContext,
  LoadFnOutput,
  NextLoadFn,
  ResolveHookContext,
  ResolveFnOutput,
  NextResolveFn
} from './types.mjs';

// eslint-disable-next-line no-useless-escape
const extPattern = /\/.+\.(m)?[jt]{1}s$/;
export function hasModuleExt (url: string): boolean {
  const m = extPattern.exec(url);
  return m !== null && m[1] === 'm';
}

const supportedExts = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.jsx',
  '.ts',
  '.mts',
  '.cts',
  '.tsx',
]);

/**
* The `resolve` hook chain is responsible for resolving file URL for a given module specifier and parent URL, and optionally its format (such as `'module'`) as a hint to the `load` hook.
* If a format is specified, the load hook is ultimately responsible for providing the final `format` value (and it is free to ignore the hint provided by `resolve`);
* if `resolve` provides a format, a custom `load` hook is required even if only to pass the value to the Node.js default `load` hook.
*
* @param specifier The specified URL path of the module to be resolved
* @param context
* @param nextResolve The subsequent `resolve` hook in the chain, or the Node.js default `resolve` hook after the last user-supplied resolve hook
*/
export async function resolve(specifier: string, context: ResolveHookContext, nextResolve: NextResolveFn): Promise<ResolveFnOutput> {
  // 1: Any files explicitly provided by the user are executed.
  // 2: node_modules directories are skipped unless explicitly provided by the user.
  // 3: If a directory named test is encountered, the test runner will search it recursively for all all .js, .cjs, and .mjs files. All of these files are treated as test files, and do not need to match the specific naming convention detailed below. This is to accommodate projects that place all of their tests in a single test directory.
  console.log(`######### resolve ${specifier}`);
  // console.log(context);
  const importedByOthers = (!!context.parentURL);
  if (importedByOthers) {
    // modules that are imported by other modules are not transpiled
    return nextResolve(specifier, context);
  }

  const ext = extname(specifier);
  if (!supportedExts.has(ext)) {
    return nextResolve(specifier, context);
  }

  const { url: nextUrl } = nextResolve(specifier, context);
  const url = nextUrl ?? new URL(specifier, 'file://').href;
  // const url = nextUrl ?? new URL(specifier).href;
  // const url = new URL(specifier).href;

  assert(url !== null, 'url should not be null');
  assert.equal(typeof url, 'string', 'url should be a string');

  // url ends with .mjs or .mts => module
  // url ends with .js or .ts => detect format from package.json
  const isModule = hasModuleExt(url) || (await getPackageType(url)) === 'module';
  if (!isModule) {
    return nextResolve(specifier, context);
  }

  const ret = {
    format: 'power-assert', // Provide a signal to `load`
    shortCircuit: true,
    url,
  };
  console.log(`######### resolve ${specifier} => format:${ret.format}, url:${ret.url}`);
  // console.log(ret);
  return ret;
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
  console.log(`######### load ${url}`);
  // console.log(context);
  const { format } = context;
  if (format !== 'power-assert') {
    // console.log(`######### format !== 'power-assert' => ${format}`);
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
    format: 'module',
    source: transpiledCode
  };
}
