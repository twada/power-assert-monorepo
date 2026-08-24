# ADR-009: Rename `dev` Export Condition to Package-Unique `power-assert-dev`

## Status

Accepted

Amends [ADR-005](./adr-005-node-typescript-type-stripping-migration.md).

## Context

ADR-005 introduced a `dev` custom condition into the `exports` maps of the published packages, pointing at TypeScript sources (`./src/*.mts`). Running the monorepo's own tests with `node --conditions=dev` resolves inter-package imports to `.mts` sources, which Node.js executes directly via type stripping.

The published tarballs deliberately include the `src/` directory (sourcemap `sources` references), and they also carried the `dev` condition entries in `exports`. This combination breaks downstream consumers in a specific but realistic scenario:

1. A downstream project runs Node.js with `--conditions=dev` for its **own** run-from-source setup. `dev` is a generic, common condition name, so unrelated projects legitimately use it.
2. Node.js then resolves `@power-assert/*` imports to `.mts` files **inside the consumer's `node_modules`**.
3. Node.js refuses type stripping under `node_modules` and fails with `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`.

The monorepo itself never observes this failure: npm workspace symlinks realpath to locations outside `node_modules`, so type stripping is permitted.

This was hit in practice on 2026-08-23 by a downstream monorepo whose `test:dev` runner used `--conditions=dev` and had `@power-assert/runtime` 0.3.1 installed.

### Alternatives considered

1. **Strip the `dev` entries from `exports` at publish time** (`prepack` rewriting `package.json`): fixes the tarball completely, but adds fragile publish-time mutation machinery to an otherwise simple release process, and makes the published `package.json` diverge from the repository.
2. **Exclude `src/` from published `files`**: worse than doing nothing — the `dev` entries would dangle, and resolution under `--conditions=dev` would throw `ERR_MODULE_NOT_FOUND` instead. It would also break sourcemap `sources` references.
3. **Rename the condition to a package-unique name**: removes the collision with the generic `dev` name at the root. The condition still ships in the tarball, but only an explicit, deliberate `--conditions=power-assert-dev` opts into it.

## Decision

Rename the custom condition from `dev` to **`power-assert-dev`** across the monorepo:

- `exports` maps of `@power-assert/transpiler-core`, `@power-assert/transpiler`, `@power-assert/runtime`, `@power-assert/node`, and `rollup-plugin-power-assert`
- All npm scripts using `--conditions=dev` (root and per-package)
- The integration test guard that detects source-mode execution via `process.execArgv`

Custom conditions should be namespaced by project; generic names like `dev` belong to the consumer, not to published packages. This mirrors the convention Node.js documentation suggests for community conditions and matches the same resolution adopted in the sibling mockist monorepo (`mockist-dev`).

## Consequences

### Benefits

1. **Downstream `--conditions=dev` is safe again**: consumers using a generic `dev` condition resolve the compiled `default` entries (`./dist/*.mjs`) as intended.
2. **No publish-time machinery**: the repository `package.json` and the published one stay identical.
3. **Sourcemaps keep working**: `src/` remains in the tarballs.

### Trade-offs

1. **The condition still ships**: a consumer who explicitly passes `--conditions=power-assert-dev` will still hit `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. This is acceptable — the name makes it an explicit opt-in that only makes sense inside this monorepo.
2. **Slightly more verbose command lines** in development scripts.

### Affected releases

Patch releases of all packages that carried the `dev` condition: `@power-assert/transpiler-core` 0.5.1, `@power-assert/transpiler` 0.7.1, `@power-assert/runtime` 0.3.2, `@power-assert/node` 0.7.1, `rollup-plugin-power-assert` 0.2.2. (`esbuild-plugin-power-assert` and `swc-plugin-power-assert` never carried the condition.)
