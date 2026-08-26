# release-please CHANGELOG Duplication: Mechanism and Ecosystem Practices

Research conducted 2026-08-26/27. This report backs the trigger-condition
updates made to RELEASING.md and ADR-010, and records what the wider
ecosystem does about the underlying problem.

## Background

Release PR #43 contained a duplicate CHANGELOG entry for PR #42: the same
`fix:` change appeared twice, once linking the branch commit and once
linking the merge commit. ADR-010 initially recorded the trigger conditions
as "not fully understood".

## Mechanism

release-please's commit parser (`splitMessages()` in
[src/commit.ts](https://github.com/googleapis/release-please/blob/main/src/commit.ts))
deliberately splits a commit's message body into multiple conventional
commits, using this regex:

```
/\r?\n\r?\n(?=(?:feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(?:\(.*?\))?: )/
```

Each paragraph that starts directly with a Conventional Commits type is
treated as a separate commit. This is an intentional feature (it lets one
commit carry multiple releasable units); there is no option to disable it,
and the upstream report
([googleapis/release-please#2476](https://github.com/googleapis/release-please/issues/2476))
was closed as not planned.

GitHub's plain merge commits place the PR title in the message body
(subject: `Merge pull request #N from ...`, body: the PR title). PR #42's
merge commit body was exactly `fix: rename dev export condition to
package-unique power-assert-dev`, so release-please counted it in addition
to the branch commit.

### Trigger conditions

A duplicate entry appears whenever all three hold:

1. the PR lands as a plain merge commit (PR title goes into the body), and
2. the PR title is in Conventional Commits form with a changelog-visible
   type (`fix:`/`feat:`), and
3. the PR's branch commits carry Conventional Commits messages for the
   same change.

This also explains why seemingly equivalent earlier merges did not
duplicate: PRs #38/#39/#41 had `chore:`/`ci:`/`docs:` titles (parsed, but
hidden from the changelog), and PR #26 (`fix(runtime):` title) predates
release-please's scan range (released manually as runtime 0.3.1).

Note two subtleties of the split regex:

- The commit list that GitHub's squash "Default message" preset writes into
  the body uses `* ` bullet prefixes, which do **not** match the regex, so
  that preset does not by itself cause duplicates.
- Titles with a breaking-change marker (`feat!:`) do not match the regex
  either.

The dangerous shapes are a *bare* Conventional Commits line as its own
paragraph: a plain merge commit's body (the PR title), or a PR description
carried into a squash commit body by the "Pull request title and
description" preset.

## Ecosystem survey 1: projects with Conventional Commits PR titles

Electron, Vite, and Excalidraw (the projects listed as users of
[amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request))
all enforce Conventional Commits **PR titles** via CI and merge exclusively
by **squash** (0 merge commits in the 30 most recent commits of each; every
subject is `type: title (#N)`). However, none of them uses release-please,
so Conventional-Commits-shaped lines left in commit bodies are harmless to
them:

- **Electron** generates release notes from PR metadata (a mandatory
  `Notes:` field in the PR template) rather than commit messages; squash
  bodies retain commit lists/descriptions.
- **Vite** generates changelogs with conventional-changelog tooling that
  reads only commit subjects; squash bodies are mostly empty, and
  CONTRIBUTING.md instructs maintainers to use "Squash and Merge" and edit
  the message to follow the convention.
- **Excalidraw** does no commit-based changelog automation; it uses
  action-semantic-pull-request with `requireScope: true` and derives PR
  labels from the scope.

## Ecosystem survey 2: the full combo (PR title lint + release-please + squash)

Verified real-world setups:

- **googleapis org** (release-please's home, thousands of repos): squash
  only, Conventional Commits PR titles enforced as a required check by
  their own GitHub App
  ([conventional-commit-lint](https://github.com/googleapis/repo-automation-bots/tree/main/packages/conventional-commit-lint))
  — the same architecture as amannn's action.
- **npm org** ([@npmcli/template-oss](https://github.com/npm/template-oss)):
  the most systematized example. Repo settings are codified in a probot
  [settings.yml](https://github.com/npm/ini/blob/main/.github/settings.yml):
  `allow_merge_commit: false`, `squash_merge_commit_title: PR_TITLE`,
  `squash_merge_commit_message: PR_BODY`. Linting runs commitlint over the
  branch commits and falls back to linting the PR title if they fail.
  Releases via their release-please fork (@npmcli/release-please).
- **absinthe-graphql/absinthe**: a minimal reference wiring —
  [pr.yml](https://github.com/absinthe-graphql/absinthe/blob/main/.github/workflows/pr.yml)
  runs `amannn/action-semantic-pull-request@v6` (on `pull_request_target`
  with types `[opened, synchronize, edited, reopened]`, `pull-requests:
  read` only), ci.yml runs `release-please-action@v5` on pushes to main,
  and publish.yml publishes on release-published.
- A GitHub code search finds **216 repositories** codifying
  `squash_merge_commit_title: PR_TITLE` in probot settings.yml (npm/*,
  clap-rs/clap, crate-ci/typos, ...), i.e. the squash preset is commonly
  managed as code rather than left to the settings UI.

### Lessons

1. Pin the squash presets declaratively (probot settings app or similar);
   the setting is admin-only in the API, so drift is otherwise invisible.
2. The body preset is the key design decision:
   `BLANK` ("Pull request title") structurally guarantees one changelog
   entry per PR; `PR_BODY` (npm's choice) turns release-please's body
   splitting into an intentional escape hatch — a bare Conventional Commits
   paragraph in the PR description yields an extra releasable unit — at the
   cost of accidental-paragraph risk.
3. `validateSingleCommit` in amannn's action is legacy: GitHub's "Default
   to PR title for squash merge commits" setting (= `PR_TITLE` preset)
   supersedes it.
4. Bot PRs need aligned titles (dependabot `commit-message.prefix`,
   renovate `semanticCommits`). release-please's own release PR title
   (`chore(main): release ...`) passes type/scope-restricted lints.

## Ecosystem survey 3: BREAKING CHANGE details under squash merge

A follow-up question: with squash merge and a `BLANK` body preset, only the
PR title survives, so the detailed `BREAKING CHANGE:` footer that
Conventional Commits prescribes would be lost from the CHANGELOG. How do
real setups handle this?

release-please's breaking-note extraction works as follows: with `!` alone
(`feat!:`), the title becomes the note; with a `BREAKING CHANGE:` /
`BREAKING-CHANGE:` footer, the footer text becomes the note. The README's
own squash guidance is to write footers into the squash commit body.

Three observed approaches:

- **Title-only (Google's own practice).** release-please's own breaking
  commits (e.g. `feat(deps)!: update octokit to v20 (#2490)`,
  `feat!: require node 18+ (#2069)`) carry no footer at all; the
  "⚠ BREAKING CHANGES" sections of its CHANGELOG are one-line titles.
  Details are left to docs and manually edited GitHub Releases.
- **`PR_BODY` preset carrying footers (npm's practice) — verified
  end-to-end.** npm/cli commit
  [d36945d](https://github.com/npm/cli/commit/d36945dec26ffdc6899b3dc561260cd1b980a2f8)
  is `fix!: do not unwrap single-item arrays in --json output` with body
  `BREAKING CHANGE: npm view --json now always returns an array.` — and
  npm/cli's v12.0.0 CHANGELOG shows exactly the footer text as the
  breaking note. Multi-sentence notes with migration instructions in that
  CHANGELOG all arrived the same way (the PR description, carried into the
  squash body by `squash_merge_commit_message: PR_BODY`, contains the
  footer).
- **`BLANK` preset + writing the footer by hand at merge time.** The
  preset is a default, not a ceiling: the merge dialog's extended
  description accepts a footer when needed (Vite's "edit commit message"
  maintainer instruction is this style). If forgotten,
  `BEGIN_COMMIT_OVERRIDE` in the merged PR body works retroactively under
  squash (though not under plain merges).

The failure mode is documented in the wild:
[npm/cli#9838](https://github.com/npm/cli/pull/9838) records an npm 12
breaking change that landed as plain `feat:` (no `!`, no footer), was
classified as a regular feature, and was omitted from the v12.0.0 breaking
notes. The recovery procedure (spelled out in that commit message): never
rewrite the merged commit; hand-edit the root CHANGELOG via a docs PR, and
fix the already-published GitHub Release separately with
`gh release edit --notes-file` after saving its full body. Their preventive
rule: breaking commits must use both the `!` marker and a
`BREAKING CHANGE:` footer.

Note that PR-title linting cannot enforce any of this: titles are a single
line, so the lint can only see `!`. Footer presence is a matter of
convention and review (a PR-template section or a danger-style check on the
PR body are possible supplements).

## Implications for this repository

This repository deliberately keeps plain merge commits (ADR-010), so the
operative mitigation remains the duplicate-entry check plus hand-editing
the release PR (RELEASING.md). Plain merges also have a hidden advantage
here: branch commits' `BREAKING CHANGE:` footers survive in history as-is
and reach release-please unchanged, so the breaking-note problem above
does not arise. If a future decision moves to squash-based automation, the
minimal target configuration is: squash-only with `PR_TITLE` + `BLANK`
presets pinned as code, plus action-semantic-pull-request as a required
check (absinthe's wiring applies almost verbatim); no release-please
changes would be needed — but one operational rule is added: write the
`BREAKING CHANGE:` footer into the squash body at merge time (or fix it
afterwards with `BEGIN_COMMIT_OVERRIDE`).
