# ADR-010: Release Process Modernization — release-please + npm Trusted Publishing (OIDC)

## Status

Accepted (implemented 2026-08-24/25; first release through the new pipeline:
`@power-assert/node` 0.7.0, `@power-assert/transpiler` 0.7.0,
`rollup-plugin-power-assert` 0.2.1)

## Context

The npm supply-chain threat model has shifted from "malicious package code" to
"maintainer tokens and CI/CD" (the chalk/debug phishing incident, Shai-Hulud,
and similar campaigns). npm is responding by force-migrating the ecosystem:
classic tokens revoked, granular tokens capped at 90 days, Trusted Publishing
(OIDC) generally available and recommended.

This monorepo's previous release flow was entirely manual and local:
`cl.cjs` generated CHANGELOG entries, a hand-edited `release.sh` rewrote
cross-package dependency ranges and bumped versions, and `npm publish` ran
locally with a long-lived token. Specific problems:

1. A long-lived npm token on a developer machine was the single point of
   compromise
2. No build reproducibility or provenance; nothing tied a published tarball to
   a commit
3. Every release required hand-editing scripts, with cross-package version
   propagation done by grep/jq
4. CI was not hardened (mutable action tags, default token permissions)
5. All six package CHANGELOGs started directly with a version heading,
   which breaks release-please's insertion position
6. `swc-plugin-power-assert` kept `Cargo.toml`/`Cargo.lock` in sync via an
   `npm version` lifecycle script, which release-please never runs

The same modernization was completed first on the single-package repository
`extract-git-treeish`, providing end-to-end validation of the core stack and
several hard-won lessons that shaped this design.

## Decision

Adopt a push-driven, tokenless release pipeline with two human gates:

1. **release-please in manifest mode** with the node-workspace plugin
   (`updatePeerDependencies`) computes versions from Conventional Commits,
   maintains CHANGELOGs, rewrites cross-package dependency ranges, cascades
   patch bumps to dependents, and creates per-component tags
   (`<component>-vX.Y.Z`, matching the pre-existing tag format).
   `bump-minor-pre-major` keeps breaking changes at minor bumps while all
   packages are pre-1.0.
2. **Human gate 1**: the release PR is reviewed and merged by a maintainer.
3. **Publishing runs in GitHub Actions only** (`release.yml`): the publish job
   is gated by **human gate 2** — a GitHub Environment (`npm`) with a required
   reviewer, `main`-only deployments, and no admin bypass. The job rebuilds
   and tests everything (`npm ci --ignore-scripts`, `build:dist`, `test:dist`)
   immediately before publishing each released package with
   `npm publish --provenance` authenticated via **OIDC Trusted Publishing**
   (bound to repo + workflow filename + environment; allowed action
   `npm publish` only).
4. **Staged publishing is deliberately not used**: it does not support
   workspaces, and per-package 2FA approval (6×) is impractical for a
   monorepo. Re-evaluate if npm ships batch approval.
5. **Cargo version sync** uses a release-please generic updater
   (`# x-release-please-version` annotation in `Cargo.toml`) plus a
   `sync-release-pr` job that runs `cargo update -p swc-plugin-power-assert`
   on the release PR branch. The old `npm version` lifecycle script is removed.
6. **Private packages** (`esbuild-plugin-power-assert` — now explicitly
   `"private": true` — and `@power-assert/integration-tests`) are excluded
   from releasing and use wildcard (`*`) ranges for workspace-internal
   dependencies, so npm always links the workspace instead of falling back to
   stale registry versions after bumps.
7. **CHANGELOG policy**: generated entries are left untouched stylistically;
   factually wrong entries are corrected by hand on the release PR (file and
   PR body) before merging. Merged history is never rewritten.
8. Supporting hardening (Phase 0): SHA-pinned actions with least-privilege
   permissions, zizmor in CI, dependabot with a 7-day npm cooldown, unified
   `git+https` repository URLs (required for sigstore provenance
   verification), a `main` branch ruleset (PR required, no force-push, no
   bypass), and read-only default workflow permissions.
9. **Deferred to a later phase**: tag rulesets and immutable releases. During
   the ramp-up period tags remain deletable, preserving the option to delete
   and re-release on publish failure. `workflow_dispatch` with an explicit
   paths input serves as the recovery path for partial publish failures.

The full analysis, alternatives comparison (vs. Changesets), and rollout plan
live in the (untracked) Japanese planning documents; the operational runbook
is [RELEASING.md](../RELEASING.md).

## Consequences

### Positive

- No npm credentials exist locally or as CI secrets; compromising a developer
  machine or the workflow file alone can no longer publish
- Every published tarball carries SLSA provenance verifiable via
  `npm audit signatures`, and is built and tested from a clean checkout
  seconds before publishing
- Version computation, CHANGELOG maintenance, cross-package range rewriting,
  cascading bumps, and tagging are mechanical; the human role shifts to two
  explicit review gates
- The first release through the pipeline exercised a breaking change, plain
  features, and a cascading dependency bump across three packages in one pass

### Negative / accepted trade-offs

- CI does not run on release PRs (GITHUB_TOKEN-created PRs never trigger
  workflows); mitigated by the publish job's full rebuild + test. A GitHub App
  token can enable CI later if needed
- A release PR is not refreshed when base changes leave release notes
  unchanged; the remedy (close + recreate) is documented in RELEASING.md
- Release note correction via `BEGIN_COMMIT_OVERRIDE` is unavailable under
  the plain-merge strategy; hand-editing the release PR is the fallback
- Recovering a failed publish requires a manual `workflow_dispatch` with an
  explicit paths input, because re-running a failed job reuses the stale
  workflow definition and `paths_released` is empty on dispatch
