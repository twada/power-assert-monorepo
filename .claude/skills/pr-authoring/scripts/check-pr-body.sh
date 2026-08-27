#!/usr/bin/env bash
# Preflight check for PR bodies in this repository's squash-merge +
# release-please regime. The PR body becomes the squash commit body
# verbatim, and release-please parses it; this script catches the text
# shapes that trigger unintended release-please behavior.
#
# Usage: check-pr-body.sh [--allow-cc-paragraphs] <body-file> [<pr-title>]
# Exit status: 0 = clean (warnings allowed), 1 = hazard found or usage error.
set -u

allow_cc=0
if [ "${1:-}" = "--allow-cc-paragraphs" ]; then
  allow_cc=1
  shift
fi

body_file="${1:-}"
title="${2:-}"

if [ -z "$body_file" ] || [ ! -f "$body_file" ]; then
  echo "usage: check-pr-body.sh [--allow-cc-paragraphs] <body-file> [<pr-title>]" >&2
  exit 1
fi

status=0

# 1. Paragraphs starting with a bare Conventional Commits line.
#    release-please's splitMessages() splits the commit body on
#    /\n\n(?=(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.*?\))?: )/
#    and each match becomes an extra changelog entry. The type list and
#    the paragraph-start anchoring below mirror that regex exactly.
cc_hits=$(awk '
  prev_blank && $0 ~ /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]*\))?!?: / {
    print NR": "$0
  }
  { prev_blank = ($0 == "") }
  BEGIN { prev_blank = 1 }
' "$body_file")
if [ -n "$cc_hits" ]; then
  if [ "$allow_cc" -eq 1 ]; then
    echo "NOTE: bare Conventional Commits paragraph(s) allowed by flag (each becomes a changelog entry):"
    echo "$cc_hits"
  else
    echo "HAZARD: paragraph(s) start with a bare Conventional Commits line — release-please will emit each as an extra changelog entry:"
    echo "$cc_hits"
    echo "Reword so the paragraph does not start with the type (backticks, a bullet, or reflowing all work), split the PR, or pass --allow-cc-paragraphs if the extra entries are intended."
    status=1
  fi
fi

# 2. Literal commit-override marker strings. release-please matches them
#    as plain substrings anywhere in the merged PR body; a mention in
#    prose silently replaces the commit message it parses.
for marker in "BEGIN_COMMIT_OVERRIDE" "END_COMMIT_OVERRIDE"; do
  if grep -qF "$marker" "$body_file"; then
    echo "HAZARD: literal override marker '$marker' found — release-please matches it as a bare substring and hijacks commit parsing. Refer to it obliquely (e.g. \"the commit-override markers\")."
    status=1
  fi
done

# 3. Breaking-change consistency between title and body (warnings only).
if [ -n "$title" ]; then
  title_breaking=0
  case "$title" in
    *!:*) title_breaking=1 ;;
  esac
  body_breaking=0
  if grep -qE '^BREAKING[ -]CHANGE: ' "$body_file"; then
    body_breaking=1
  fi
  if [ "$title_breaking" -eq 1 ] && [ "$body_breaking" -eq 0 ]; then
    echo "WARNING: title marks a breaking change (!) but the body has no 'BREAKING CHANGE:' paragraph — the changelog's breaking section will show only the title."
  fi
  if [ "$title_breaking" -eq 0 ] && [ "$body_breaking" -eq 1 ]; then
    echo "WARNING: body has a 'BREAKING CHANGE:' paragraph but the title has no '!' — add the marker so the semver bump matches the documented break."
  fi
fi

if [ "$status" -eq 0 ]; then
  echo "OK: no release-please hazards found in $body_file"
fi
exit "$status"
