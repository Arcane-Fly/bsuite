#!/usr/bin/env bash
#
# SECRET SCANNING — over the commit range under review, not this repo's ENTIRE
# history.
#
# FOLLOW 32. Before this fix, `secret-scan.yml`'s `pull_request`/`push` jobs
# ran `gitleaks detect --source .` with no `--log-opts`, which walks every
# commit reachable from the checked-out ref — for a PR against `development`,
# that is `development`'s entire history plus the PR's own commits. Measured
# 2026-09-03: bsuite#3027's own feature branch briefly carried a key-shaped
# fixture at commit f7ac5285; the branch was rewritten to drop it
# (`git reset --soft` + recommit + `--force-with-lease`), but the unscoped
# scan still walked every OTHER open PR's history too — because the range was
# never the PR's own diff, it was "everything this ref can see" — and reddened
# every one of them at 01:03, blocking unrelated work over a commit that was
# not even in most of those PRs' ancestry.
#
# Ported from R80.4's and braden's own `scripts/gitleaks-scan.sh` (2026-08-12),
# the estate's already-shipped fix for the SAME class of bug (there: a
# `--log-opts="-1"` tip-only scan that MISSED secrets in earlier commits of a
# multi-commit PR — the opposite failure mode, same root cause: the range was
# never derived from the event).
#
# WHY IT FAILS LOUDLY RATHER THAN FALLING BACK TO FULL HISTORY
#
# "Just scan everything" is not available — that is the bug this file fixes,
# not a fallback for when range resolution is inconvenient. So there are
# exactly two outcomes: scan the range, or FAIL with a diagnostic. Silently
# scanning nothing (or scanning everything) and reporting green is the defect
# this exists to prevent, and it is the one that looks like success.
#
# Runnable locally, deliberately — a guard nobody can execute is documentation:
#   GITLEAKS_BASE_SHA=<sha> GITLEAKS_HEAD_SHA=<sha> bash scripts/gitleaks-scan.sh

set -euo pipefail

GITLEAKS_VERSION="${GITLEAKS_VERSION:-8.24.3}"
BIN_DIR="${GITLEAKS_BIN_DIR:-/tmp/gitleaks-bin}"
BIN="${BIN_DIR}/gitleaks"

if [ ! -x "$BIN" ]; then
  mkdir -p "$BIN_DIR"
  curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GITLEAKS_VERSION}/gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz" \
    | tar xz -C "$BIN_DIR"
fi

"$BIN" version

ZERO_SHA="0000000000000000000000000000000000000000"
BASE_SHA="${GITLEAKS_BASE_SHA:-}"
HEAD_SHA="${GITLEAKS_HEAD_SHA:-}"

resolvable() {
  [ -n "${1:-}" ] && [ "${1}" != "$ZERO_SHA" ] && git cat-file -e "${1}^{commit}" 2>/dev/null
}

if ! resolvable "$HEAD_SHA"; then
  # On a pull_request event the checked-out ref is the MERGE commit, not the PR
  # head (github/docs, events-that-trigger-workflows: "GITHUB_SHA for this event
  # is the last merge commit of the pull request merge branch"). The workflow
  # passes head.sha explicitly; falling back to HEAD keeps the range anchored to
  # whatever was actually checked out if it ever does not.
  echo "gitleaks-scan: head '${HEAD_SHA:-<unset>}' not resolvable, using HEAD" >&2
  HEAD_SHA="$(git rev-parse HEAD)"
fi

if ! resolvable "$BASE_SHA"; then
  echo "gitleaks-scan: FATAL — base commit '${BASE_SHA:-<unset>}' is missing or unresolvable." >&2
  echo "  Cannot determine the commit range to scan." >&2
  echo "  Refusing to report success over an unscanned range." >&2
  echo "  On a push to a NEW branch, github.event.before is the all-zero SHA and" >&2
  echo "  there is no base to compare against; the workflow passes the merge-base" >&2
  echo "  with the default branch instead." >&2
  echo "  Otherwise: check that actions/checkout ran with fetch-depth: 0." >&2
  exit 1
fi

RANGE="${BASE_SHA}..${HEAD_SHA}"
COUNT="$(git rev-list --no-merges --count "$RANGE")"

echo "gitleaks-scan: range ${RANGE} (${COUNT} non-merge commits)"

if [ "$COUNT" -eq 0 ]; then
  echo "gitleaks-scan: no commits in range; nothing to scan." >&2
  exit 0
fi

# --redact: a finding must not print the secret itself into a CI log readable by
# anyone who can see the run. -v: without it the output is "leaks found: N" and
# nothing else, which is not actionable.
exec "$BIN" detect \
  --source=. \
  --log-opts="--no-merges ${RANGE}" \
  --redact \
  -v
