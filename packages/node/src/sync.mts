import { strict as assert } from 'node:assert';
import { transpileWithInlineSourceMapSync } from '@power-assert/transpiler';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { registerHooks, findPackageJSON, stripTypeScriptTypes } from 'node:module';
import type { RegisterHooksOptions, LoadHookSync, LoadFnOutput, LoadHookContext, ResolveHookSync, ResolveFnOutput, ResolveHookContext } from 'node:module';

type SyncNextResolveFn = (specifier: string, context?: ResolveHookContext) => ResolveFnOutput;
type SyncNextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput;

const supportedExts = new Set([
  '.js',
  '.mjs',
  '.ts',
  '.mts'
]);

const resolveSync: ResolveHookSync = function resolve (specifier: string, context: ResolveHookContext, nextResolve: SyncNextResolveFn): ResolveFnOutput {
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

const loadSync: LoadHookSync = function load (url: string, context: LoadHookContext, nextLoad: SyncNextLoadFn): LoadFnOutput {
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

function getPackageType (url: string): string | undefined {
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

const hooksOptions: RegisterHooksOptions = {
  resolve: resolveSync,
  load: loadSync
};
registerHooks(hooksOptions);
