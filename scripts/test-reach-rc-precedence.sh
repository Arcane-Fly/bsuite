#!/usr/bin/env bash
# Positive control for the per-app rc-accumulation line in
# .github/workflows/consumer-lockfile-reach.yml ("Regenerate every consumer
# lockfile that can reach a published version" step, manual-dispatch path).
#
# WHY THIS EXISTS. bsuite#3089 (Copilot review, thread 3940077853): the loop
# only ever recorded the FIRST non-zero exit code it saw. An app returning a
# genuine verification failure (rc=1) AFTER an app that was signal-killed
# (e.g. 137, or any other non-zero) left the job reporting the earlier code
# forever, and the real rc=1 vanished silently.
#
# On today's code paths this is practically unreachable: both callers of this
# loop pass --write, and rc=2 (WOULD-CHANGE) is only ever set when !write
# (scripts/regen-consumer-lockfile.mjs:259); a crash exits 1; the default
# --all path aggregates INSIDE the script, where FAILED is checked before
# WOULD-CHANGE (regen-consumer-lockfile.mjs:345-346). The per-app
# accumulation this file tests runs only on workflow_dispatch with an
# explicit, comma-separated `apps` input — but a signal exit (137) ahead of a
# later rc=1 is still possible there, so the loop is hardened rather than
# left as a latent trap.
#
# PRECEDENCE: a 1 (genuine verification failure) always wins outright;
# otherwise the first non-zero code standing wins, same as before.
#
# THIS TEST DOES NOT HOLD A SECOND COPY OF THE LOGIC TO DRIFT. It greps the
# real line verbatim out of the workflow file and `eval`s it inside a
# throwaway loop over synthetic iter_rc values, so it is exercising the
# ACTUAL shell code the workflow runs, not a hand-copied lookalike. If the
# real line is ever edited, this either keeps testing the new behaviour (both
# run identical code) or the grep below stops matching and this script fails
# LOUDLY rather than silently validating a copy nobody is running anymore.
#
# Usage: scripts/test-reach-rc-precedence.sh
set -uo pipefail
cd "$(dirname "$0")/.."
WORKFLOW=".github/workflows/consumer-lockfile-reach.yml"

# ANCHORED, not a bare substring search: an earlier version of this pattern
# matched the same text sitting inside a `#`-commented-out line too (the line
# is still THERE, just dead), which would have kept this self-test green
# after a silent revert. Anchoring the match to the whole line — leading
# indentation and all, nothing before `if`, nothing after the closing `fi` —
# means a `#` (or anything else) ahead of `if` breaks the match.
LINE=$(grep -oE '^[[:space:]]+if \[ "\$iter_rc" = "1" \] \|\| \[ "\$rc" = "0" \]; then rc=\$iter_rc; fi$' "$WORKFLOW" || true)
if [ -z "$LINE" ]; then
  echo "FAIL: the expected rc-precedence line was not found verbatim in $WORKFLOW." >&2
  echo "This test greps the real workflow line rather than holding its own copy —" >&2
  echo "if the loop was legitimately rewritten, update this script's expected" >&2
  echo "pattern to match, in the same change." >&2
  exit 1
fi

fail=0
cases=0

run_case() { # $1 = space-separated iter_rc sequence  $2 = expected final rc
  local seq="$1" expected="$2" rc=0 iter_rc
  cases=$((cases + 1))
  for iter_rc in $seq; do
    eval "$LINE"
  done
  if [ "$rc" != "$expected" ]; then
    echo "  FAIL  sequence [$seq] -> expected rc=$expected, got rc=$rc"
    fail=1
  else
    echo "  ok    sequence [$seq] -> rc=$rc"
  fi
}

planned_cases=$(grep -cE '^run_case ' "$0")
echo "consumer-lockfile-reach rc-precedence self-test: $planned_cases cases planned (bsuite#3089, thread 3940077853)."

# ── 1. THE BUG ITSELF. Old code: rc stays 2 forever once set, so the later
#       genuine failure (1) never overwrites it. A 1 must always win.
run_case "2 1" "1"

# ── 2. A signal kill (137) sits between two other codes; the trailing 1 must
#       still win regardless of what came before it.
run_case "0 137 1" "1"

# ── 3. No 1 anywhere: precedence falls back to first-non-zero-wins, same as
#       the old behaviour, so this case must NOT regress.
run_case "0 2" "2"

# ── 4. All clean: must stay 0.
run_case "0 0" "0"

if [ "$fail" -ne 0 ]; then
  echo "rc-precedence self-test FAILED — the loop is not prioritising a genuine verification failure over an earlier code."
  exit 1
fi
if [ "$cases" != "$planned_cases" ]; then
  echo "  FAIL  planned $planned_cases cases but ran $cases — the head-line count has drifted from the body."
  exit 1
fi
echo "consumer-lockfile-reach rc-precedence: self-test OK ($cases cases)"
