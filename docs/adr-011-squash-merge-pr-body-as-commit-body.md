# ADR-011: Squash Merge with the PR Body as the Commit Body

## Status

Accepted (2026-08-27; presets applied the same day, first squash merges:
PRs #47, #48, #49)

Amends [ADR-010](./adr-010-release-process-modernization.md).

## Context

ADR-010 built the release automation on plain merge commits and accepted a
trade-off: when a merged PR's title is in Conventional Commits form,
release-please emits a duplicate changelog entry, to be removed by
hand-editing the release PR.

Research on 2026-08-27 made that trade-off's cause deterministic:
release-please deliberately splits commit message bodies on
paragraph-leading Conventional Commits lines, GitHub's plain merge commits
carry the PR title in their body, and upstream closed the report as not
planned. As long as PR titles follow Conventional Commits — this
repository's convention — plain merges duplicate entries structurally, not
accidentally. The full mechanism, the ecosystem survey (squash merge with
Conventional-Commits PR titles is the dominant practice; npm's
title-plus-description squash configuration is proven with release-please,
breaking-change footers included), and the pitfalls are recorded in
[the investigation report](./investigations/2026-08-27-release-please-changelog-duplication-research.en.md).

A second concern shaped which squash configuration to adopt: durability of
intent outside GitHub. This repository treats git itself, not GitHub, as
the durable record — detailed rationale must survive in `git log` even if
the project ever leaves the platform. A squash configuration that keeps
only the PR title would move the narrative of every change into a
proprietary silo.

## Decision

1. **Transition gradually from plain merges to squash merges.** The
   atomic, revertable unit of history is the squashed PR. PRs are expected
   to shrink toward single-intent changes, with behavior changes and
   structure changes separated at the PR level (in the tidy-first sense);
   a PR carrying multiple releasable units should become rare.
2. **Squash message presets are pinned to subject = PR title, body = PR
   description** (GitHub's "Pull request title and description"). The PR
   description thereby becomes the permanent commit body.
3. **The PR description is the canonical narrative of a change**, written
   to commit-message quality. Review-only material (checklists,
   screenshots, reviewer verification steps) goes into the PR's first
   comment instead, so it never fossilizes in git history.
4. **Enforcement is delegated to the project skill**
   `.claude/skills/pr-authoring/` (workflow rules plus a preflight script
   that mechanically rejects the known release-please hazards). This ADR
   records the decision; the skill records the evolving procedure; the
   investigation report records the evidence.

## Alternatives considered

- **Keep plain merges** (the ADR-010 status quo). Preserves branch
  commits and their footers verbatim, but the duplicate-entry hand-edit
  becomes a permanent tax, and the collision between
  Conventional-Commits PR titles and release-please never ends.
- **Squash with a title-only message** (blank body). Solves the
  duplication, but the detailed rationale of every change would live only
  in the PR — leaving GitHub would lose it. Rejected on durability
  grounds.
- **Rebase merge.** Keeps each commit verbatim and no merge commit ever
  carries the title, but PR boundaries and numbers vanish from history,
  losing the grouping of commits into one logical change.

## Consequences

- Duplicate changelog entries are structurally impossible for
  squash-merged PRs. RELEASING.md's duplicate-entry check remains
  relevant only for plain merges made during the transition; once squash
  is the norm, RELEASING.md and the amended parts of ADR-010 should be
  revised.
- `BREAKING CHANGE:` details reach the changelog through a bare footer
  paragraph in the PR description. A missing footer silently degrades the
  changelog's breaking section to the bare title — the costly failure
  mode npm/cli documented — so the skill's preflight cross-checks the
  title's `!` against the body's footer.
- Two release-please hazards become standing operating rules, enforced by
  the preflight script: no unintentional paragraph-leading Conventional
  Commits lines in a PR description, and never spelling the literal
  commit-override marker strings in a PR body.
- The commit-override mechanism, unusable under plain merges, becomes the
  retroactive fix for release notes on squash-merged PRs.
- Branch commits' individual messages die at squash. The finest durable
  grain of the development narrative is the PR; branch commits are
  working checkpoints, and exploration history lives in session
  transcripts, not in `git log`.
