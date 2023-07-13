// start borrowing from https://github.com/DefinitelyTyped/DefinitelyTyped/pull/65490
export type ModuleFormat = 'builtin' | 'commonjs' | 'json' | 'module' | 'wasm';
type ModuleSource = string | ArrayBuffer | NodeJS.TypedArray;
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
  importAssertions?: { type?: 'json' };
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

export type NextLoadFn = (url: string, context?: LoadHookContext) => LoadFnOutput;
export type ModuleMatchResult = readonly [boolean, boolean];
