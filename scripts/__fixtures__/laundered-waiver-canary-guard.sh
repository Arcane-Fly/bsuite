#!/usr/bin/env bash
# A GUARD THAT SKIPPED, REPORTING ITSELF AS ONE THAT PASSED.
#
# The positive control for the laundered-waiver rule in check-guard-self-reporting.mjs.
# The silent canary beside it proves the watcher can still spot a guard that examined
# NOTHING; this one proves it can still spot a guard that examined MOST things and let
# the rest fall on the floor. They are different defects and need different controls.
#
# Modelled on the real one, broadcast by the R80.4 lane on 2026-08-22: `dod.mjs` marked a
# self-waived benchmark `pass: true, waived: true`, the roll-up filtered on `!x.pass`, and
# "all 21 awards at 18/18" was really 16 of 18. It survived five days because the
# per-subject lines were honest and the AGGREGATE is the line anyone quotes.
#
# So this fixture is deliberately honest per-subject and dishonest in the summary — the
# exact shape. It states a real count, which clears the denominator check, and names a
# waiver it never counts, which must not clear the new one.
echo "  ok    subject-a"
echo "  ok    subject-b"
echo "  SKIP  subject-c"
echo ""
# The denominator noun MUST be one the watcher recognises, or the fixture gets caught by
# the OTHER rule and proves nothing about this one. First version said "21 subjects";
# `subject` is not in DENOMINATOR_NOUNS, so the canary reported "correctly caught" with
# the waiver rule stubbed out entirely. A control that tests the case your code already
# handles is not a control.
echo "checked 21 files across 18 checks — all clean."
echo "Some benchmarks were waived in this environment."
exit 0
