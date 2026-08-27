---
name: pr-authoring
description: Author pull requests for this repository under its squash-merge + release-please regime — Conventional Commits PR titles that drive releases, and PR bodies written to commit-message quality because the squash merge turns the PR body into the permanent git commit body. Use whenever creating a PR, drafting or revising a PR title or body or description, preparing to squash-merge, or shipping committed work as a PR — whether the request is in English or Japanese, and even if the user only says "create a PR", "open a pull request", "send/raise a PR", "push and make a PR", "fix the PR wording", "PR にして", "push して PR 作成", or "PR の文面を直して".
---

# PR Authoring

## Why this workflow exists

This repository squash-merges PRs with the presets PR_TITLE + PR_BODY:
the PR title becomes the commit subject (with ` (#N)` appended) and the
PR description becomes the commit body, verbatim (GitHub hard-wraps it at
about 72 columns at merge time). Two consequences drive everything below:

1. **The PR body is permanent git history.** It must satisfy
   commit-message quality, and must make sense to a `git log` reader who
   has no access to GitHub — the repository treats git, not GitHub, as
   the durable record of intent.
2. **release-please parses the squash commit.** The title's type decides
   whether a release happens; stray Conventional-Commits-shaped text in
   the body can create changelog entries on its own.

Full rationale and the research behind these rules:
[docs/investigations/2026-08-27-release-please-changelog-duplication-research.en.md](../../../docs/investigations/2026-08-27-release-please-changelog-duplication-research.en.md)

## PR title

- Conventional Commits form: `type(scope): summary` — lowercase summary,
  imperative mood, English.
- The type drives release-please, so choose it deliberately (see also
  CLAUDE.md's release rules): `fix:` / `feat:` on package code produce a
  release PR; `chore:` / `ci:` / `docs:` / `refactor:` / `test:` are
  hidden from the changelog and never release.
- A breaking change is marked with `!` (`feat(runtime)!: …`). The title
  cannot carry details — those go in the body as a footer paragraph
  (next section).
- Keep the title comfortably short: GitHub appends ` (#N)` and the whole
  line is the commit subject.

## PR body — the durable-information filter

Write the body as the commit message it will become. For every line ask:
*does this help someone reading `git log` years from now, possibly
without GitHub?*

- Structured markdown headers are welcome — `## Summary` / `## Motivation`
  / `## Changes` / `## Testing` / `## References`, or `## What / Why`
  style. Markdown reads fine as plain text, so structure costs nothing.
- Belongs in the body: the intent and motivation, what changed and why
  this approach, which tests were added **and that they fail without the
  change**, and issue references (`Fixes #N` — closes the issue and the
  reference survives in git).
- Does NOT belong in the body — post as the PR's **first comment**
  instead: review checklists, screenshots, reviewer verification steps
  ("run X and observe Y"), open questions for the reviewer. These are
  review-time information; fossilized in a commit body they are noise.
- Put long paths and URLs on their own line, never inside a bullet with
  other text: the 72-column wrap at merge time mangles long bullets.

## Breaking changes

The `!` in the title only marks the semver bump. The detailed CHANGELOG
entry comes from a bare footer paragraph in the body:

```
BREAKING CHANGE: <user-visible impact, and how to migrate>
```

Write it as its own paragraph starting at column 0. Omitting it means
the changelog's breaking-changes section shows only the title — how a
breaking change gets under-documented (this failure mode and its costly
manual recovery are documented in the investigation report).

## release-please pitfalls — preflight every body

Before `gh pr create`, and again after any body edit, run:

```bash
.claude/skills/pr-authoring/scripts/check-pr-body.sh <body-file> [<title>]
```

It rejects the two known hazards:

1. **A paragraph starting with a bare Conventional Commits line**
   (`fix: …` at column 0 after a blank line). release-please deliberately
   splits commit bodies on such paragraphs, each becoming an extra
   changelog entry. When quoting commit-like text in prose, keep it from
   starting a paragraph — backticks, a list bullet, or reflowing the
   sentence all prevent the match. Exception: a PR intentionally carrying
   several releasable units may use bare paragraphs for exactly this
   effect — prefer splitting the PR, and pass `--allow-cc-paragraphs`
   only when the extra entries are wanted.
2. **The literal commit-override marker strings.** release-please scans
   merged PR bodies for them with a plain substring match; a prose
   mention hijacks commit parsing silently (discovered first-hand in this
   repository — see the investigation report). Refer to them obliquely,
   e.g. "the commit-override markers".

Given the title, the script also cross-checks breaking-change
consistency (`!` in the title vs. a `BREAKING CHANGE:` paragraph in the
body) and warns on either being present without the other.

## Merging

Squash merge is the default. In the merge dialog, confirm the subject is
the PR title and the body is the PR description (the presets prefill
this; a stray edit can reintroduce noise). Plain merges remain possible
during the transition period, but they reintroduce the
duplicate-changelog-entry problem documented in RELEASING.md — a
Conventional-Commits-form PR title lands in the merge commit body and is
counted twice.
