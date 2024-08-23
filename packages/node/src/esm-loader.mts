import { strict as assert } from 'node:assert';
import { transpileWithInlineSourceMap } from '@power-assert/transpiler';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LoadFnOutput, LoadHookContext, ResolveFnOutput, ResolveHookContext } from 'node:module';

type NextResolveFn = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput | Promise<ResolveFnOutput>;
type NextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput | Promise<LoadFnOutput>;

const supportedExts = new Set([
  '.js',
  '.mjs',
  '.ts',
  '.mts'
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
export async function resolve (specifier: string, context: ResolveHookContext, nextResolve: NextResolveFn): Promise<ResolveFnOutput> {
  const nextResolveWithShortCircuitFalse = async (specifier: string, context: ResolveHookContext): Promise<ResolveFnOutput> => {
    const resolved = await nextResolve(specifier, context);
    return { ...resolved, shortCircuit: false };
  };

  // 1: Any files explicitly provided by the user are executed.
  // 2: node_modules directories are skipped unless explicitly provided by the user.
  // 3: If a directory named test is encountered, the test runner will search it recursively for all all .js, .cjs, and .mjs files. All of these files are treated as test files, and do not need to match the specific naming convention detailed below. This is to accommodate projects that place all of their tests in a single test directory.
  const isEntryPoint = (context.parentURL === undefined);
  if (!isEntryPoint) {
    // modules that are imported by other modules are not transpiled
    return nextResolveWithShortCircuitFalse(specifier, context);
  }

  const ext = extname(specifier);
  if (!supportedExts.has(ext)) {
    return nextResolveWithShortCircuitFalse(specifier, context);
  }

  const { url: nextUrl } = await nextResolveWithShortCircuitFalse(specifier, context);
  const url = nextUrl ?? new URL(specifier, context.parentURL).href;
  assert(url !== null, 'url should not be null');
  assert.equal(typeof url, 'string', 'url should be a string');

  // url ends with .mjs or .mts => module
  // url ends with .js or .ts => detect format from package.json
  const isModule = ext.startsWith('.m') || (await getPackageType(url)) === 'module';
  if (!isModule) {
    return nextResolveWithShortCircuitFalse(specifier, context);
  }
  const { importAttributes } = context;
  // MEMO: need to mutate importAttributes directly since shallow copy of importAttributes with object rest spread operator does not work in this case
  importAttributes.powerAssert = 'power-assert';
  // const extraAttrs = { powerAssert: 'power-assert' };
  const resolved: ResolveFnOutput = {
    format: 'module',
    // importAttributes: { ...importAttributes, ...extraAttrs },
    importAttributes,
    shortCircuit: false,
    url
  };
  return resolved;
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
  const nextLoadWithShortCircuitFalse = async (url: string, context: LoadHookContext): Promise<LoadFnOutput> => {
    const loaded = await nextLoad(url, context);
    return { ...loaded, shortCircuit: false };
  };
  const { importAttributes } = context;
  if (!importAttributes.powerAssert) {
    return nextLoadWithShortCircuitFalse(url, context);
  }
  delete importAttributes.powerAssert;

  const { source: rawSource } = await nextLoadWithShortCircuitFalse(url, context);
  assert(rawSource !== undefined, 'rawSource should not be undefined');
  const incomingCode = rawSource.toString();
  const transpiled = await transpileWithInlineSourceMap(incomingCode, { file: url });
  return {
    format: 'module',
    shortCircuit: false,
    source: transpiled.code
  };
}

// start borrowing from https://nodejs.org/api/module.html#transpilation
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
  const dir = isFilePath
    ? dirname(fileURLToPath(url))
    : url;
  // Compose a file path to a package.json in the same directory,
  // which may or may not exist
  const packagePath = resolvePath(dir, 'package.json');
  // Try to read the possibly nonexistent package.json
  const type = await readFile(packagePath, { encoding: 'utf8' })
    .then((filestring) => JSON.parse(filestring).type)
    .catch((err) => {
      if (err?.code !== 'ENOENT') console.error(err);
    });
  // If package.json existed and contained a `type` field with a value, voilà
  if (type) return type;
  // Otherwise, (if not at the root) continue checking the next directory up
  // If at the root, stop and return false
  return dir.length > 1 && getPackageType(resolvePath(dir, '..'));
}
// end borrowing from https://nodejs.org/api/module.html#transpilation
