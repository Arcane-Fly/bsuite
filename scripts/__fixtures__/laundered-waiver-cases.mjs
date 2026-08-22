import { readFileSync } from 'node:fs';
const src = readFileSync('/home/braden/Desktop/Dev/bsuite/scripts/check-guard-self-reporting.mjs', 'utf8');
// Extract just the three pieces under test; the module runs LANE-WATCHER on import.
const grab = (re) => (src.match(re) || [])[0];
const body = [grab(/const CASE_LINE = [^\n]*\n/), grab(/export function summaryProse[\s\S]*?\n}/), grab(/function positiveCount[\s\S]*?\n}/), grab(/function tokenOffsets[\s\S]*?\n}/),
  grab(/const WAIVER_WORDS = [^\n]*\n/), grab(/const WAIVER_NOUNS = [^\n]*\n/),
  grab(/export function waiverWithoutCount[\s\S]*?\n}/)].join('\n').replace(/export /g, '');
const fn = new Function(body + '\nreturn waiverWithoutCount;')();
const CASES = [
  ['44 subpath(s) across 16 package(s) import cleanly under Node ESM (5 skipped).', false, 'counts its skips before the noun'],
  ['documents skipped as HISTORICAL (verdict-bannered / dated-audit): 50\nsource-path references checked: 747', false, 'counts AFTER the noun'],
  ['Files scanned: 412\nHISTORICAL (verdict-bannered / dated-audit, skipped): 50', false, 'count after noun, parenthesised'],
  ['check-schema-lag --self-test: 6 cases exercised (pending-not-failing, below-floor-excluded, applied-excluded)', false, 'a hyphenated TEST-CASE NAME is not a waiver'],
  ['10 cases planned (positive control). ok clean tree is silent (count=0)', false, 'no waiver noun at all'],
  ['self-test: 10 cases planned\n  ok    oklch(from …) is skipped (count=4, exit=1)\n  ok    dist/ excluded (count=4)', false, 'a per-CASE result line is not a waiver claim'],
  ['12 rules compared.\n  ✓ crm7 in sync\n  skip  conduit — no rules dir', false, 'a per-case skip line is enumerated, not laundered'],
  // The control must sit OUTSIDE the documented adjacency limit, or it asserts the
  // opposite of the limit case above and one of the two has to be wrong. Here the
  // waiver noun has no number anywhere near it, which is the shape R804 actually hit.
  ['12 rules compared and every comparison agreed.\n  ✓ crm7 in sync\n\nSome benchmarks in this environment were skipped.', true, 'CONTROL: a laundered waiver in the SUMMARY still fails'],
  ['21 awards checked, all pass. Some benchmarks were skipped.', true, 'THE DEFECT — waiver named, never counted'],
  ['all 21 awards at 18/18 — CLEAN', false, 'no waiver language'],
  ['27 manifests; 159 deps; 0 skipped', false, 'an explicit zero is honest'],
  ['33 files examined — 25 carry a banner, 8 do not. 2 files not subject to the rule.', false, 'no standalone waiver noun'],
  ['6 apps scanned. 3 exempt.', false, 'exempt with a count'],
  ['WAIVER BUDGET (per rule):\n  _shared.js  0/0 waived\n  no-text-white.js  0/0 waived', false, 'a ratio 0/0 IS a count'],
  ['WAIVER BUDGET (per rule — a waived copy is a submodule running a rule the monorepo did not sanction):\n  _shared.js  0/0 waived', false, 'an uncounted HEADER above counted rows is honest'],
  ['12 benchmarks run. 16/18 measured, 2 waived.', false, 'a ratio and a count together'],
  // KNOWN LIMIT, asserted as it behaves rather than as it ideally would. Adjacency
  // cannot tell which noun a count belongs to, so `6` (which belongs to "apps") is
  // accepted for "exempt". A false negative is the safe direction here: the other way
  // blocks a promotion on a guard that is telling the truth.
  ['6 apps scanned. Two were exempt.', false, 'KNOWN LIMIT — adjacency cannot bind a count to its noun'],
];
let bad = 0;
for (const [t, want, name] of CASES) {
  const got = fn(t);
  console.log(`  ${got === want ? 'ok  ' : 'FAIL'}  ${name}`);
  if (got !== want) bad++;
}
console.log(bad ? `\n  ${bad} of ${CASES.length} FAILED` : `\n  all ${CASES.length} cases pass`);
