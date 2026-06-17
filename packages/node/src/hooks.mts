import { strict as assert } from 'node:assert';
import { transpileWithInlineSourceMapSync } from '@power-assert/transpiler';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { findPackageJSON, stripTypeScriptTypes } from 'node:module';
import type { LoadHookSync, LoadFnOutput, LoadHookContext, ResolveHookSync, ResolveFnOutput, ResolveHookContext } from 'node:module';

type SyncNextResolveFn = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput;
type SyncNextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput;

const supportedExts = new Set([
  '.js',
  '.mjs',
  '.ts',
  '.mts'
]);

/**
 * The resolve hook chain is responsible for telling Node.js where to find and how to cache a given import statement or expression, or require call.
 * It can optionally return a format (such as 'module') as a hint to the load hook.
 * If a format is specified, the load hook is ultimately responsible for providing the final format value (and it is free to ignore the hint provided by resolve);
 * if resolve provides a format, a custom load hook is required even if only to pass the value to the Node.js default load hook.
 *
 * @param specifier The specified URL path of the module to be resolved
 * @param context The context in which the module is being resolved
 * @param nextResolve The subsequent resolve hook in the chain, or the Node.js default resolve hook after the last user-supplied resolve hook
 * @returns The result of the resolution, including the resolved URL and optional format
 */
export const resolve: ResolveHookSync = function resolve (specifier: string, context: ResolveHookContext, nextResolve: SyncNextResolveFn): ResolveFnOutput {
  const nextResolveWithShortCircuitFalse = (specifier: string, context: ResolveHookContext): ResolveFnOutput => {
    const resolved = nextResolve(specifier, context);
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

  const { url: nextUrl, format } = nextResolveWithShortCircuitFalse(specifier, context);
  const url = nextUrl ?? new URL(specifier, context.parentURL).href;
  assert(url !== null, 'url should not be null');
  assert.equal(typeof url, 'string', 'url should be a string');

  // url ends with .mjs or .mts => module
  // url ends with .js or .ts => detect format from package.json
  const isModule = ext.startsWith('.m') || getPackageType(url) === 'module';
  if (!isModule) {
    return nextResolveWithShortCircuitFalse(specifier, context);
  }
  const { importAttributes } = context;
  // MEMO: need to mutate importAttributes directly since shallow copy of importAttributes with object rest spread operator does not work in this case
  importAttributes.powerAssert = 'power-assert';
  // const extraAttrs = { powerAssert: 'power-assert' };
  const resolved: ResolveFnOutput = {
    format: format === 'module-typescript' ? 'module-typescript' : 'module',
    // importAttributes: { ...importAttributes, ...extraAttrs },
    importAttributes,
    shortCircuit: false,
    url
  };
  return resolved;
};

/**
 * The `load` hook provides a way to define a custom method for retrieving the source code of a resolved URL.
 * This would allow a loader to potentially avoid reading files from disk.
 * It could also be used to map an unrecognized format to a supported one, for example yaml to module.
 *
 * @param url The URL returned by the resolve chain
 * @param context Metadata about the module being loaded, including the format and import attributes
 * @param nextLoad The subsequent load hook in the chain, or the Node.js default load hook after the last user-supplied load hook
 * @returns The result of the load, including the source code and format
 */
export const load: LoadHookSync = function load (url: string, context: LoadHookContext, nextLoad: SyncNextLoadFn): LoadFnOutput {
  const nextLoadWithShortCircuitFalse = (url: string, context: LoadHookContext): LoadFnOutput => {
    const loaded = nextLoad(url, context);
    return { ...loaded, shortCircuit: false };
  };
  const { importAttributes, format } = context;
  if (!importAttributes.powerAssert) {
    return nextLoadWithShortCircuitFalse(url, context);
  }
  delete importAttributes.powerAssert;

  const { source: rawSource } = nextLoadWithShortCircuitFalse(url, context);
  assert(rawSource !== undefined, 'rawSource should not be undefined');
  let incomingCode = rawSource.toString();
  if (format === 'module-typescript') {
    incomingCode = stripTypeScriptTypes(incomingCode);
  }
  const transpiled = transpileWithInlineSourceMapSync(incomingCode, { file: url });
  return {
    format,
    shortCircuit: false,
    source: transpiled.code
  };
};

// start borrowing from https://nodejs.org/api/module.html#transpilation
function getPackageType (url: string): string | undefined {
  // `url` is only a file path during the first iteration when passed the
  // resolved url from the load() hook
  // an actual file path from load() will contain a file extension as it's
  // required by the spec
  // this simple truthy check for whether `url` contains a file extension will
  // work for most projects but does not cover some edge-cases (such as
  // extensionless files or a url ending in a trailing space)
  const pJson = findPackageJSON(url);
  if (!pJson) {
    return undefined;
  }
  try {
    const file = readFileSync(pJson, 'utf-8');
    return JSON.parse(file)?.type;
  } catch {
    return undefined;
  }
}
// end borrowing from https://nodejs.org/api/module.html#transpilation
