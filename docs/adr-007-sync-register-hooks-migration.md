# ADR-007: Migration from async module.register to sync module.registerHooks

## Status

Accepted

## Context

The `@power-assert/node` package uses Node.js module hooks to intercept and transpile test files at load time. Previously, it relied on `module.register()` to register asynchronous customization hooks (`resolve` and `load`) that ran in a separate loader thread.

Node.js has deprecated `module.register()` in favor of `module.registerHooks()`, which runs hooks synchronously in the main thread. This is not merely a rename — it represents a fundamental shift from an asynchronous, off-thread model to a synchronous, in-process model.

### Key differences between the two APIs

| Aspect | `module.register()` (deprecated) | `module.registerHooks()` (new) |
|---|---|---|
| Execution model | Async hooks in a separate loader thread | Sync hooks in the main thread |
| Hook signatures | `async function resolve(...)`, `async function load(...)` | Sync function signatures (`ResolveHookSync`, `LoadHookSync`) |
| Registration | Indirect — passes a specifier URL to a hooks file | Direct — passes hook function references |
| I/O in hooks | `await readFile()`, `await transpile()` | `readFileSync()`, `transpileSync()` |
| Available since | Node.js 20.6.0 | Node.js 22.18.0 |

### Development progression

The migration was carried out incrementally:

1. **Sync transpiler foundation**: Added synchronous versions of transpile functions (`transpileWithInlineSourceMapSync`, `transpileWithSeparatedSourceMapSync`, `transpileSync`, `findIncomingSourceMapSync`) to `@power-assert/transpiler`, since the new sync hooks cannot call async functions.

2. **Parallel sync implementation**: Created a standalone `sync.mts` as an independent sync implementation alongside the existing async `hooks.mts`, exposed via a separate `@power-assert/node/sync` export. This allowed validation without disrupting the existing async path.

3. **Decision to consolidate**: After Node.js officially deprecated `module.register()`, the parallel-export strategy ("subject to change" as noted in the commit) was abandoned in favor of a breaking change that replaces the async implementation entirely.

## Decision

Replace the async `module.register()` hooks with sync `module.registerHooks()` as the sole implementation, accepting this as a breaking change.

### 1. Hook function signatures

**Before**: Async exported functions
```typescript
export async function resolve(specifier, context, nextResolve): Promise<ResolveFnOutput> { ... }
export async function load(url, context, nextLoad): Promise<LoadFnOutput> { ... }
```

**After**: Sync typed function expressions
```typescript
export const resolve: ResolveHookSync = function resolve(specifier, context, nextResolve): ResolveFnOutput { ... };
export const load: LoadHookSync = function load(url, context, nextLoad): LoadFnOutput { ... };
```

**Rationale**: `module.registerHooks()` requires hook functions to conform to `ResolveHookSync` and `LoadHookSync` type interfaces. Named function expressions are used (rather than arrow functions) to preserve function names in stack traces for debuggability while allowing explicit type annotation on the binding.

### 2. Registration mechanism

**Before**: Indirect registration via specifier URL using package self-reference
```typescript
import { register } from 'node:module';
register('@power-assert/node/hooks', import.meta.url);
```

**After**: Direct registration by passing function references
```typescript
import { registerHooks } from 'node:module';
import { resolve, load } from './hooks.mts';
registerHooks({ resolve, load });
```

**Rationale**: `module.registerHooks()` accepts hook functions directly as an options object, eliminating the need for the indirect specifier-based loading that `module.register()` required. This also removes the dependency on the package self-reference pattern (described in ADR-005) for hook registration, since hooks are now imported directly via relative path.

### 3. All I/O converted to synchronous

- `readFile` (from `node:fs/promises`) → `readFileSync` (from `node:fs`)
- `transpileWithInlineSourceMap` (async) → `transpileWithInlineSourceMapSync` (sync)
- `transpileWithSeparatedSourceMap` (async) → `transpileWithSeparatedSourceMapSync` (sync)
- `getPackageType` converted from async Promise-chain to sync try/catch
- All `await` expressions removed from hook functions

**Rationale**: Synchronous hooks cannot use async I/O. The sync versions perform the same operations and are acceptable here because module loading is inherently sequential — there is no concurrency benefit from async I/O in this context.

### 4. Defensive error handling in getPackageType

**Before**: Assert that `findPackageJSON()` always returns a value, use Promise chain with `.catch(() => undefined)`
```typescript
const pJson = findPackageJSON(url);
assert(pJson !== undefined, 'cannot find package.json');
return readFile(pJson, 'utf8').then(JSON.parse).then(json => json?.type).catch(() => undefined);
```

**After**: Guard against missing package.json, use try/catch
```typescript
const pJson = findPackageJSON(url);
if (!pJson) { return undefined; }
try {
  const file = readFileSync(pJson, 'utf-8');
  return JSON.parse(file)?.type;
} catch { return undefined; }
```

**Rationale**: The assertion was overly strict — `findPackageJSON()` can legitimately return `undefined` for files outside any package scope. The new implementation gracefully handles this case.

### 5. Consolidated entry point

- Removed the separate `./sync` export from `package.json`
- Deleted `src/sync.mts` (its logic was merged into `hooks.mts`)
- The single `@power-assert/node` import remains the only entry point

**Rationale**: With the async path removed, maintaining two entry points is unnecessary. A single entry point simplifies both the API surface and the implementation.

### 6. Node.js version requirement

**Before**: `>=22.14.0`
**After**: `>=22.18.0`

**Rationale**: `module.registerHooks()` with the required sync hook types (`ResolveHookSync`, `LoadHookSync`) is available from Node.js 22.18.0.

## Consequences

### Benefits

1. **Alignment with Node.js direction**: Uses the recommended API, avoiding deprecation warnings and future removal risk
2. **Simpler execution model**: Hooks run in the main thread, eliminating the complexity of cross-thread communication
3. **Simpler registration**: Direct function passing instead of indirect specifier-based loading
4. **Single code path**: No async/sync duplication to maintain
5. **Better debuggability**: Synchronous stack traces are easier to follow than async ones across thread boundaries

### Trade-offs

1. **Breaking change**: Users must update Node.js to >=22.18.0
2. **Synchronous I/O**: File reads in hooks block the event loop, though this is acceptable during module loading which is inherently sequential
3. **Loss of backward compatibility**: Users on older Node.js versions cannot use this version of `@power-assert/node`

### Risks and Mitigations

1. **Risk**: Users on Node.js 22.14.0–22.17.x cannot upgrade
   - **Mitigation**: Previous versions of `@power-assert/node` continue to work on older Node.js versions. The engines field in package.json prevents accidental installation on incompatible versions.

2. **Risk**: `module.registerHooks()` API changes in future Node.js versions
   - **Mitigation**: Unlike the deprecated `module.register()`, `registerHooks()` is the actively maintained path. The explicit `ResolveHookSync`/`LoadHookSync` type annotations will catch any signature changes at compile time.

## References

### `module.registerHooks()` — introduction

- **Proposal issue**: [nodejs/node#52219](https://github.com/nodejs/node/issues/52219) — Synchronous hooks proposal by Joyee Cheung
- **Design proposal**: [nodejs/loaders#198](https://github.com/nodejs/loaders/pull/198) — Loaders team design document
- **Implementation PR**: [nodejs/node#55698](https://github.com/nodejs/node/pull/55698) — `implement module.registerHooks()` by Joyee Cheung, landed in v23.5.0
- **Tracking issue**: [nodejs/node#56241](https://github.com/nodejs/node/issues/56241) — `module.registerHooks()` tracking issue
- **Release note**: [Node.js v23.5.0](https://nodejs.org/en/blog/release/v23.5.0), backported to [v22.15.0 LTS](https://nodejs.org/en/blog/release/v22.15.0)

### `module.register()` — deprecation (DEP0205)

- **Doc-only deprecation PR**: [nodejs/node#62395](https://github.com/nodejs/node/pull/62395) — by Geoffrey Booth, landed in v25.9.0 / v24.15.0
- **Runtime deprecation PR**: [nodejs/node#62401](https://github.com/nodejs/node/pull/62401) — by Geoffrey Booth (semver-major), landed in [v26.0.0](https://nodejs.org/en/blog/release/v26.0.0)
- **Deprecation commit**: [nodejs/node@98907f560f](https://github.com/nodejs/node/commit/98907f560f)

### Official documentation

- **`module.registerHooks()` API**: https://nodejs.org/api/module.html#moduleregisterhooksoptions
- **Deprecation list (DEP0205)**: https://nodejs.org/api/deprecations.html#DEP0205

### Background — why async hooks were deprecated

The async/off-thread hook model had fundamental architectural issues that proved unresolvable ([nodejs/node#50948](https://github.com/nodejs/node/issues/50948), [nodejs/node#51668](https://github.com/nodejs/node/issues/51668)):
- Deadlocks from cross-thread synchronous communication
- Lost `console.log()` output in the hooks worker thread
- Inability to cover `createRequire()` from off-thread
- Inter-thread communication overhead

The stated goal is to remove `module.register()` entirely in Node.js v27 ([nodejs/node#62401 comment](https://github.com/nodejs/node/pull/62401)).
