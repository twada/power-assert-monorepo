# ADR-013: Defensive `importAttributes` Handling in Sync Module Hooks

## Status

Accepted

Amends [ADR-007](./adr-007-sync-register-hooks-migration.md) (fixes a crash introduced by the sync `module.registerHooks()` migration and hardens the hook implementation it produced).

## Context

ADR-007 replaced async `module.register()` hooks with sync `module.registerHooks()` hooks. One behavioral difference was not accounted for: **sync hooks also intercept CJS `require()` calls**, which the off-thread async hooks never saw.

On that newly-intercepted path, Node.js does not populate `importAttributes` in the load hook context. The `LoadHookContext` type declares the property as required, but at runtime it is `undefined` — a divergence between Node's type declarations and its implementation. The load hook in `@power-assert/node` accessed `context.importAttributes.powerAssert` unconditionally, so from v0.7.0 (the first `registerHooks` release), the first CJS module to `require()` a builtin after hook registration crashed the whole process:

```
TypeError: Cannot read properties of undefined (reading 'powerAssert')
    at load (.../@power-assert/node/dist/hooks.mjs:74:27)
    at loadWithHooks (node:internal/modules/customization_hooks:374:18)
    at loadBuiltinWithHooks (node:internal/modules/cjs/loader:1239:22)
    at Object.<anonymous> (.../debug/src/node.js:5:13)   ← require('tty')
```

The bug was discovered during the same `registerHooks()` migration in mockist-monorepo ([twada/mockist-monorepo#18](https://github.com/twada/mockist-monorepo/pull/18), its ADR-0020), where loading the CJS `debug` package after hook registration killed the process. The package's own test matrix missed it because triggering the crash requires a CJS `require()` executed *for the first time after* registration — existing tests were ESM-centric, and the CJS modules they touched were already cached before hooks were registered.

### A second, related hazard: mutating shared context objects

The same migration left two direct mutations of hook context state:

- the resolve hook injected its marker with `importAttributes.powerAssert = 'power-assert'`, guarded by a MEMO claiming that a spread copy returned from resolve does not propagate to the load context;
- the load hook removed the marker with `delete importAttributes.powerAssert`.

Under the off-thread async model these mutations touched a structured-clone copy inside the loader thread and were harmless. Under the in-thread sync model the context objects are shared with Node.js internals and with any other registered hooks. The mockist-monorepo migration demonstrated the failure mode concretely: in-thread resolve contexts can be **non-extensible**, so adding a key throws `TypeError: Cannot add property ..., object is not extensible`.

Probing the actual behavior on Node.js v22.20.0, v23.10.0, v24.18.0 and v26.4.0 established two facts:

1. An `importAttributes` object newly created in the resolve hook and returned in its result **does** reach the load hook context on all four lines — the MEMO's claim no longer holds.
2. The default load step rejects unknown import attributes (`ERR_IMPORT_ATTRIBUTE_UNSUPPORTED`), which is why the marker must be removed before delegating to `nextLoad` — the `delete` had been doing necessary work, just on the wrong object.

## Decision

1. **Normalize before access.** Both hooks read `importAttributes` as `context.importAttributes ?? {}` and never access a property on the raw context value. This makes the CJS `require()` path a clean pass-through.
2. **Communicate the marker via copies, never by mutation.** The resolve hook returns an *augmented copy* (`{ ...importAttributes, powerAssert: 'power-assert' }`) in its result; the load hook passes a *cleansed copy* (marker removed via rest destructuring) to `nextLoad`. No hook context object is mutated.
3. **Regression test at the process level.** A test spawns `node --import @power-assert/node --eval "require('tty')"` — `--eval` code is CJS, so the `require()` traverses the registered sync hooks — and asserts a clean exit. It runs against both development sources and compiled `dist` output, closing the "first post-registration CJS require" gap in the matrix.

## Consequences

- CJS `require()` after hook registration no longer crashes. CJS modules are still not instrumented (unchanged policy — only entry-point test files are transformed); the hooks now simply delegate for them.
- The failure mode for a missing-attributes edge case degrades from process crash to "transform silently skipped", which the package's output-asserting tests would catch on any affected Node.js line.
- The powerAssert marker remains a cross-hook coupling carried through `importAttributes`. The contract is now explicit: resolve adds the marker on a copy it returns; load must remove it (again on a copy) before delegating, because default load validates attributes.
- The propagation probe covered v22.20.0 but not v22.15.0–v22.19.x (not installed locally). If an early 22.x sync-hooks implementation failed to propagate resolve-returned copies, the symptom would be the silent-skip mode above, not a crash.
- Node's `LoadHookContext` type declaring `importAttributes` as required while the CJS path omits it is an upstream type/implementation divergence; the normalization makes this package robust regardless of whether Node fixes the type or the implementation.

## References

- `module.registerHooks()` API (intercepts both ESM `import` and CJS `require()`): https://nodejs.org/api/module.html#moduleregisterhooksoptions
- Discovery context: [twada/mockist-monorepo#18](https://github.com/twada/mockist-monorepo/pull/18) and its ADR-0020 (replace async module.register with sync registerHooks)
- [ADR-007](./adr-007-sync-register-hooks-migration.md): the migration that introduced the sync hooks
