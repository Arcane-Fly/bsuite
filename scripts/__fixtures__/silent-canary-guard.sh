#!/usr/bin/env bash
# scripts/__fixtures__/silent-canary-guard.sh
#
# LANE-WATCHER's own positive control.
#
# scripts/check-guard-self-reporting.mjs (bsuite's "watcher of watchers") runs
# every guard in the estate and asserts that a clean-pass output states a
# NON-ZERO count of what it examined. That watcher is itself a guard, and
# could pass having watched nothing — exactly the class of bug it exists to
# retire. The defence is this fixture: a guard engineered to fail the rule on
# purpose. It exits 0 and prints nothing at all, byte for byte the shape of
# every founding incident this programme was built to catch:
#
#   - check-secret-naming.sh printing PASS having read an uninitialised
#     submodule (an empty directory, indistinguishable from a clean scan)
#   - crm7/scripts/lint-sql-migrations.mjs exiting 0 with zero output on its
#     real `--duplicates-only` CI invocation (bsuite crm7#1606 — see that
#     script's own header for the fix and the two regression cases it now
#     carries in `--self-test`)
#
# check-guard-self-reporting.mjs runs this fixture on EVERY invocation, not
# behind a flag, and MUST classify it as a self-reporting failure. If it ever
# stops doing so — the fixture stops being flagged, or this file goes
# missing and the watcher shrugs instead of refusing — the watcher has
# silently become exactly the thing it was built to retire, and the whole
# programme is back to zero with a green tick over it. That is a harder
# failure than any single guard failing, so the watcher treats losing this
# canary as a hard, unconditional stop (see BOOTSTRAP FAILURE in
# check-guard-self-reporting.mjs), never a soft warning.
#
# DO NOT "fix" this script by adding output, and do not delete it to make a
# report shorter. Its only job is to say nothing while exiting 0. If you are
# looking at this file because CI is red on the canary line, the watcher is
# doing its job — go read check-guard-self-reporting.mjs's report, not this
# file.
exit 0
