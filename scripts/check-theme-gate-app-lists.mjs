#!/usr/bin/env node
/**
 * check-theme-gate-app-lists.mjs — the visual gate must install every app it
 * then tries to drive.
 *
 * THE DEFECT THIS RETIRES, in the words of the run that produced it:
 *
 *     minting a session for R80.4 (scripts/theme-session.sh -> R80.4 auth.setup.ts)
 *     ✗ could not mint a session for R80.4:
 *       ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "playwright" not found
 *
 * R80.4 joined the signed-in sweep on 2026-08-22 (R80.4#187). It got
 * `@playwright/test`, a config, `tests/e2e/auth.setup.ts`, and an entry in
 * `scripts/theme-session.sh`. What it did not get was an entry in the THREE app
 * lists inside `.github/workflows/theme-conformance.yml` that install each app,
 * install its Chromium binary, and assert its auth helper exists.
 *
 * So the sweep reached R80.4, ran `pnpm exec playwright` in a directory where
 * nothing had been installed, and failed the whole job. Every run of that gate
 * on `development` failed that way from 2026-08-22 onward — and the part that
 * matters more than the red X: R80.4's authenticated routes were not being
 * checked at all in the meantime, while the gate's name still claimed they were.
 *
 * THE SHAPE OF THE BUG is one capability split across two files, added to one.
 * `theme-session.sh` knows which apps CAN mint a session; the workflow knows
 * which apps GET INSTALLED. Nothing tied them together, so they drifted in
 * silence — the workflow does not fail until the sweep reaches the app, and by
 * then the failure names playwright, not the missing list entry.
 *
 * This asserts the two agree, in both directions:
 *   - an app theme-session.sh supports but the workflow never installs → the
 *     failure above, waiting to happen again
 *   - an app the workflow installs but theme-session.sh cannot mint → wasted
 *     install minutes, and a list nobody has pruned
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKFLOW = '.github/workflows/theme-conformance.yml';
const SESSION = 'scripts/theme-session.sh';

const read = (rel) => readFileSync(resolve(ROOT, rel), 'utf8');

/** Apps `theme-session.sh` declares a session producer for. */
function sessionApps() {
  const src = read(SESSION);
  const block = src.match(/declare -A PROJECT_NAME=\(([\s\S]*?)\)/);
  if (!block) {
    console.error(`FAIL: no PROJECT_NAME map found in ${SESSION} — has it been rewritten?`);
    process.exit(1);
  }
  const apps = [...block[1].matchAll(/\[([^\]]+)\]=/g)].map((m) => m[1].trim());
  if (apps.length === 0) {
    console.error(`FAIL: PROJECT_NAME in ${SESSION} declares no apps — a zero here is a broken parse, not an empty estate.`);
    process.exit(1);
  }
  return apps;
}

/**
 * Apps each `for a in … ; do` loop in the workflow covers.
 *
 * Parsed per-loop rather than unioned, because a union hides exactly the case
 * that bit: one of the three lists updated and the others left behind still
 * looks complete when you flatten them together.
 */
function workflowLoops() {
  const src = read(WORKFLOW);
  const loops = [...src.matchAll(/for a in ([^;]+); do/g)].map((m, i) => ({
    index: i + 1,
    apps: m[1].trim().split(/\s+/),
    line: src.slice(0, m.index).split('\n').length,
  }));
  if (loops.length === 0) {
    console.error(`FAIL: no app loops found in ${WORKFLOW} — has it been rewritten?`);
    process.exit(1);
  }
  return loops;
}

const declared = sessionApps();
const loops = workflowLoops();
let failed = false;

for (const loop of loops) {
  const missing = declared.filter((a) => !loop.apps.includes(a));
  const extra = loop.apps.filter((a) => !declared.includes(a));
  if (missing.length) {
    failed = true;
    console.error(
      `FAIL: ${WORKFLOW}:${loop.line} — the sweep can mint a session for [${missing.join(', ')}], ` +
        `but this loop never installs it. The job will reach that app and die with ` +
        `'Command "playwright" not found'.`,
    );
  }
  if (extra.length) {
    failed = true;
    console.error(
      `FAIL: ${WORKFLOW}:${loop.line} — installs [${extra.join(', ')}], which ${SESSION} ` +
        `has no session producer for. Either add one, or drop it from this list.`,
    );
  }
}

if (failed) {
  console.error(
    `\nBoth files describe the same set of apps. ${SESSION} declares: ${declared.join(', ')}.`,
  );
  process.exit(1);
}

console.log(
  `PASS: ${loops.length} app list(s) in ${WORKFLOW} each cover all ${declared.length} apps ` +
    `${SESSION} can mint a session for (${declared.join(', ')}).`,
);
