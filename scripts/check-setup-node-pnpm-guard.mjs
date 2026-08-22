#!/usr/bin/env node
/**
 * scripts/check-setup-node-pnpm-guard.mjs
 *
 * Every `actions/setup-node@v5` step must set `package-manager-cache: false`.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * setup-node@v5 defaults `package-manager-cache: true`. With a `packageManager`
 * field in package.json (this estate pins `pnpm@10.33.3`), the action resolves
 * that package manager BEFORE any corepack step in the job has run, and dies:
 *
 *     ##[error] Unable to locate executable file: pnpm. Please verify either
 *     the file path exists or the file can be found within a directory
 *     specified by the PATH environment variable.
 *
 * It has bitten this repo twice, and the second time is why this guard exists:
 *
 *   1. 2026-08-19 — EVERY publish-*.yml failed at setup-node. Nothing in the
 *      estate could publish. Fixed in PR #2048 by adding
 *      `package-manager-cache: false` to each affected workflow.
 *
 *   2. PR #2048 guarded 21 of the 22 workflows using setup-node@v5 and MISSED
 *      `advance-submodule-pointers.yml`, which then failed 20 of 20 scheduled
 *      runs between 2026-08-20T07:29 and 2026-08-21T02:40, unnoticed.
 *
 * The second failure is the expensive one, and not because a pointer went
 * stale. That workflow is the estate's ONLY WRITER of submodule gitlinks; six
 * other workflows READ them. Its own header records what happens when it stops:
 * on 2026-08-18 stale pointers produced three separate false findings in one
 * night — own-package-freshness reporting a stale schema-builder that was not
 * stale, a migration rehearsal declaring R80.4 absent from the remote,
 * shared-package-reach reporting braden locked out of a theme it had declared.
 *
 *     "Every guard was right about what it read. None was reading the app that
 *      ships."
 *
 * A broken FIXER is worse than a broken READER: six green guards reading a
 * stale pointer beat one red guard for damage, because the green ones get
 * believed. A one-line omission in a hand-applied sweep across 22 files cost
 * nineteen hours of confidently wrong findings. Hand-applied sweeps need a
 * guard. This is that guard.
 *
 * DESIGN NOTES
 * ---------------------------------------------------------------------------
 *  * COUNTS, NOT PRESENCE. A workflow may contain several setup-node steps.
 *    This compares the number of `actions/setup-node@v5` occurrences against
 *    the number of `package-manager-cache: false` occurrences, so a file with
 *    two steps and one guard FAILS. A presence-only check would pass it.
 *
 *  * SCANNING ZERO IS A HARD FAILURE. A guard that silently examines nothing
 *    reports PASS — this estate's most-repeated failure class, and the reason
 *    guard-self-reporting.yml (LANE-WATCHER) exists. No workflow files, or no
 *    setup-node steps, exits non-zero rather than passing.
 *
 *  * IT REPORTS ITS OWN COUNTS. LANE-WATCHER fails any guard that exits 0
 *    without stating a non-zero number of things examined. The clean-pass line
 *    names both the files scanned and the steps verified.
 *
 * Exit 0 = every setup-node@v5 step is guarded.
 * Exit 1 = at least one is not, or the scan examined nothing.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
const SETUP_NODE = /uses:\s*actions\/setup-node@v5/g;
const GUARD = /package-manager-cache:\s*false/g;

/** A floor, not a guess: this estate had 22 setup-node@v5 steps on 2026-08-21.
 *  A scan that suddenly sees far fewer is broken, not clean. */
const MIN_EXPECTED_STEPS = 10;

function countMatches(text, re) {
  return (text.match(re) ?? []).length;
}

function main() {
  if (!existsSync(WORKFLOW_DIR)) {
    console.error(`FAIL: ${WORKFLOW_DIR} does not exist - run from the repo root.`);
    process.exit(1);
  }

  const files = readdirSync(WORKFLOW_DIR).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );

  if (files.length === 0) {
    console.error(
      `FAIL: no workflow files in ${WORKFLOW_DIR}. A scan of nothing is not a pass.`,
    );
    process.exit(1);
  }

  const offenders = [];
  let filesUsingSetupNode = 0;
  let stepsSeen = 0;
  let stepsGuarded = 0;

  for (const file of files.sort()) {
    const text = readFileSync(join(WORKFLOW_DIR, file), 'utf8');
    const steps = countMatches(text, SETUP_NODE);
    if (steps === 0) continue;

    filesUsingSetupNode += 1;
    stepsSeen += steps;

    const guards = countMatches(text, GUARD);
    stepsGuarded += Math.min(guards, steps);

    if (guards < steps) {
      offenders.push({ file, steps, guards });
    }
  }

  if (stepsSeen === 0) {
    console.error(
      `FAIL: scanned ${files.length} workflow files and found ZERO ` +
        `actions/setup-node@v5 steps. Implausible for this repo - the scan is ` +
        `broken, not the workflows.`,
    );
    process.exit(1);
  }

  if (stepsSeen < MIN_EXPECTED_STEPS) {
    console.error(
      `FAIL: only ${stepsSeen} setup-node@v5 steps found across ${files.length} ` +
        `files; expected at least ${MIN_EXPECTED_STEPS}. Scan scope looks wrong.`,
    );
    process.exit(1);
  }

  if (offenders.length > 0) {
    console.error(
      `FAIL: ${offenders.length} workflow file(s) use actions/setup-node@v5 ` +
        `without package-manager-cache: false on every step.\n`,
    );
    for (const { file, steps, guards } of offenders) {
      console.error(
        `  ${WORKFLOW_DIR}/${file} - ${steps} setup-node step(s), ${guards} guarded`,
      );
    }
    console.error(
      `\nsetup-node@v5 resolves the packageManager field's pnpm before corepack ` +
        `runs and fails with "Unable to locate executable file: pnpm".\n` +
        `Add to each setup-node step's \`with:\` block:\n\n` +
        `          package-manager-cache: false\n`,
    );
    process.exit(1);
  }

  console.log(
    `ok - ${stepsGuarded}/${stepsSeen} actions/setup-node@v5 steps guarded with ` +
      `package-manager-cache: false across ${filesUsingSetupNode} workflow files ` +
      `(${files.length} scanned).`,
  );
}

main();
