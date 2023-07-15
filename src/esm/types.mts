type KeyValuePairs = { [key: string]: any };

// start borrowing from https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65490
export type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
type ModuleSource = string | ArrayBuffer | NodeJS.TypedArray;

export interface ResolveHookContext {
    /**
     * Export conditions of the relevant `package.json`
     */
    conditions: string[];
    /**
     *  An object whose key-value pairs represent the assertions for the module to import
     */
    importAssertions: KeyValuePairs;
    /**
     * The module importing this one, or undefined if this is the Node.js entry point
     */
    parentURL: string | undefined;
}
export interface ResolveFnOutput {
    /**
     * A hint to the load hook (it might be ignored)
     */
    format?: ModuleFormat | null | undefined;
    /**
     * The import assertions to use when caching the module (optional; if excluded the input will be used)
     */
    importAssertions?: KeyValuePairs | undefined;
    /**
     * A signal that this hook intends to terminate the chain of `resolve` hooks.
     * @default false
     */
    shortCircuit?: boolean | undefined;
    /**
     * The absolute URL to which this input resolves
     */
    url: string;
}


/**
 * The `resolve` hook chain is responsible for resolving file URL for a given module specifier and parent URL, and optionally its format (such as `'module'`) as a hint to the `load` hook.
 * If a format is specified, the load hook is ultimately responsible for providing the final `format` value (and it is free to ignore the hint provided by `resolve`);
 * if `resolve` provides a format, a custom `load` hook is required even if only to pass the value to the Node.js default `load` hook.
 *
 * @param specifier The specified URL path of the module to be resolved
 * @param context
 * @param nextResolve The subsequent `resolve` hook in the chain, or the Node.js default `resolve` hook after the last user-supplied resolve hook
 */
export type ResolveHook = (
    specifier: string,
    context: ResolveHookContext,
    nextResolve: (specifier: string, context?: ResolveHookContext) => ResolveFnOutput
) => ResolveFnOutput | Promise<ResolveFnOutput>;

export interface LoadHookContext {
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
  importAssertions?: KeyValuePairs;
}
export interface LoadFnOutput {
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

export type NextResolveFn =  (specifier: string, context?: ResolveHookContext) => ResolveFnOutput;
export type NextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput;
export type ModuleMatchResult = readonly [boolean, boolean];
