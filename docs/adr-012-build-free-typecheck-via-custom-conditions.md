# ADR-012: Build-Free Type Checking via the `power-assert-dev` Custom Condition

## Status

Accepted

Amends [ADR-009](./adr-009-package-unique-dev-condition.md) (gives the `power-assert-dev` condition a second role). Addresses a consequence of [ADR-005](./adr-005-node-typescript-type-stripping-migration.md).

## Context

ADR-005 moved the development test loop onto Node.js type stripping: `npm run test:dev` executes `.mts` sources directly, so tests run fast and frequently without a build step. The trade-off was that type checking silently moved to the back of the pipeline — the only `tsc` invocation left was the emitting `tsc --build` inside `build:dist`, so type errors surfaced at release-preparation time rather than during everyday development.

Meanwhile the toolchain had been progressively replaced with fast tools — oxlint ([ADR-008](./adr-008-eslint-to-oxc-migration.md)), oxfmt, and the native TypeScript 7 compiler (adopted 2026-08-29, cutting the full project-references build from ~5.2s to ~0.95s). A whole-repository static check became cheap enough to run on every edit, so the goal was set: lint, format check, type check, and tests should all run in one fast batch (`npm run check` / `npm test`), with type checking no longer deferred.

The obstacle is monorepo-specific. A check-only `tsc -p tsconfig.typecheck.json` over all workspace sources must resolve cross-package imports such as `@power-assert/transpiler-core`. Those resolve through each package's `exports` map, whose `"types"` condition points at built typings (`./dist/*.d.mts`) — requiring exactly the build the type check is trying to avoid, or worse, binding against stale typings from an earlier build.

The `exports` maps already contain a `power-assert-dev` condition (introduced by ADR-005, renamed by ADR-009) pointing at the `./src/*.mts` sources, used by Node.js at development runtime via `--conditions=power-assert-dev`.

### Alternatives considered

1. **`paths` mapping in `tsconfig.typecheck.json`**: map each workspace package name to its entry source file. Works deterministically, but duplicates the entry-point list already encoded in the `exports` maps, must be maintained by hand as packages and subpaths (e.g. `@power-assert/node/hooks`) are added, and expresses "resolve to source" in a second, tsconfig-specific mechanism.
2. **`customConditions: ["power-assert-dev"]` with `exports` maps unchanged**: appears to work on a clean tree, but only by accident — TypeScript matches the `"types"` condition first (key order wins), finds `./dist/*.d.mts` missing, and falls through to `power-assert-dev`. As soon as `dist` exists, `"types"` wins and the check binds to stale built typings. A mutation experiment (changing an exported function's parameter type without rebuilding) confirmed the failure mode: errors inside the edited package were still reported, but all call-site errors in dependent packages were silently missed. The check's coverage would depend nondeterministically on the presence and freshness of `dist` — reintroducing the deferred-typecheck problem in a harder-to-notice form.
3. **`tsc --build` over the project references**: requires emitting declarations, which is the very coupling of type checking to building that this decision removes.

## Decision

1. Add `tsconfig.typecheck.json`: a single non-composite, `noEmit`, incremental program including `packages/*/src/**/*.mts` across the whole monorepo, with `"customConditions": ["power-assert-dev"]`.
2. In every `exports` map that declares `power-assert-dev` (transpiler-core, transpiler, runtime, node, rollup-plugin-power-assert), list `power-assert-dev` **ahead of** `"types"` within each conditions block. TypeScript resolves the first matching key in declaration order, so this makes the type check bind to workspace sources unconditionally — whether `dist` exists or not.
3. Wire the check into the everyday commands: `npm run typecheck` (type check alone), `npm run check` (oxlint + `oxfmt --check` + typecheck), `npm test` (check + `test:dev`), and run `npm run check` in CI ahead of the tests.

## Consequences

- Type checking runs on every `npm test` again. Measured on the reference machine: `typecheck` ~0.35s cold, `check` ~0.8s, `npm test` including the full test suite ~1.3s.
- **The `exports` key order is now load-bearing.** `power-assert-dev` listed ahead of `"types"` looks like a stylistic choice but is an invariant: reordering it back silently downgrades the type check to stale `dist` typings with no error raised — only missing diagnostics. Treat the order as part of the contract when editing `exports` maps, and keep new conditional entry points consistent with it.
- Runtime and consumer resolution are unchanged. Node.js never matches `"types"`, so development runtime resolution under `--conditions=power-assert-dev` is identical, as is production resolution to `default`. TypeScript consumers of the published packages do not enable the custom condition, skip the `power-assert-dev` key, and resolve `"types"` first exactly as before. ADR-009's analysis of the condition in published tarballs is unaffected.
- The `power-assert-dev` condition now has two roles: run-from-source at development runtime (ADR-005/ADR-009) and source-resolution for build-free type checking (this ADR). A future rename or removal of the condition must account for both.
- The type check program is independent of the project-references build (`tsconfig.build.json`), which continues to own emitting and declaration generation for `build:dist`.
