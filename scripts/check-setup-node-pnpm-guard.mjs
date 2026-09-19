#!/usr/bin/env node
/**
 * scripts/check-setup-node-pnpm-guard.mjs
 *
 * Every `actions/setup-node@v5` step must set `package-manager-cache: false`,
 * or — in a job that really installs dependencies with pnpm already on PATH —
 * carry the explicit `cache: 'pnpm'` form (see SCOPE).
 *
 * WHY THIS EXISTS — TWO FAILURE MODES, ONE GUARD
 * ---------------------------------------------------------------------------
 * setup-node@v5 defaults `package-manager-cache: true`. With a `packageManager`
 * field in package.json (this estate pins `pnpm@10.33.3`), the action engages
 * its package-manager cache even when no `cache:` input is set. Both then and
 * at the post step it needs pnpm and/or the pnpm store directory to exist, and
 * in this estate neither necessarily does. Two distinct failure modes result:
 *
 * MODE A — SETUP TIME. The action resolves the package manager BEFORE any
 * corepack step in the job has run, and dies:
 *
 *     ##[error] Unable to locate executable file: pnpm. Please verify either
 *     the file path exists or the file can be found within a directory
 *     specified by the PATH environment variable.
 *
 * MODE B — POST STEP. The job never creates a package-manager store (it runs
 * no install at all), so on any PR whose lockfile diff yields a NEW cache key
 * the post step attempts a save, finds no store directory, and errors:
 *
 *     ##[error]Path Validation Error: Path(s) specified in the action for
 *     caching do(es) not exist, hence no cache is being saved.
 *
 * Upstream confirmed both: actions/setup-node#1363 (post-step Path Validation
 * Error with `packageManager` set and no install run; maintainers endorse
 * `package-manager-cache: false` as the fix) and actions/toolkit#2128. Upstream
 * later restricted automatic caching to npm-only in actions/setup-node#1374,
 * so a bump to v6 is an alternative fix — this estate fixes in place instead
 * (bsuite#3150), keeping the explicit flag the guard enforces.
 *
 * It has bitten this repo in both modes, and the second time is why this
 * guard exists:
 *
 *   1. MODE A, 2026-08-19 — EVERY publish-*.yml failed at setup-node. Nothing
 *      in the estate could publish. Fixed in PR #2048 by adding
 *      `package-manager-cache: false` to each affected workflow.
 *
 *   2. PR #2048 guarded 21 of the 22 workflows using setup-node@v5 and MISSED
 *      `advance-submodule-pointers.yml`, which then failed 20 of 20 scheduled
 *      runs between 2026-08-20T07:29 and 2026-08-21T02:40, unnoticed.
 *
 *   3. MODE B, 2026-09-07 — `control-boundary-contrast` (crm7, and the same
 *      file in business-suite-unified) failed its POST step with the Path
 *      Validation Error on lockfile-changing PRs (crm7 run 34106545891 on
 *      `chore/lockfile-reach`). bsuite#3150. Fixed per-file in crm7#5fc97b0aa
 *      and BSU#72ad87b (both on app development, awaiting promotion); this
 *      guard is what keeps the class closed.
 *
 * The advance-submodule-pointers failure is the expensive one, and not because
 * a pointer went stale. That workflow is the estate's ONLY WRITER of submodule
 * gitlinks; six other workflows READ them. Its own header records what happens
 * when it stops: on 2026-08-18 stale pointers produced three separate false
 * findings in one night — own-package-freshness reporting a stale
 * schema-builder that was not stale, a migration rehearsal declaring R80.4
 * absent from the remote, shared-package-reach reporting braden locked out of
 * a theme it had declared.
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
 * SCOPE
 * ---------------------------------------------------------------------------
 * The guard checks ONLY `actions/setup-node@v5` steps — the only major whose
 * default `package-manager-cache: true` auto-engages caching for pnpm from the
 * `packageManager` field. It deliberately does NOT flag:
 *   * setup-node@v4 steps (no auto-cache, no package-manager-cache input), and
 *   * setup-node@v6 steps (auto-cache restricted to npm by actions#1374).
 * Both exclusions are a choice recorded in bsuite#3150, not an oversight.
 *
 * In --scope (app) mode the explicit `cache: 'pnpm'` form is ALSO accepted as
 * guarded, when the file shows the full install-bearing pattern: a
 * `pnpm/action-setup` step (pnpm on PATH) before the setup-node step, an
 * anchored `cache: 'pnpm'` key line for it, and a real `pnpm install` script
 * line in the file (the store must exist or mode B fires anyway). The parent's
 * install-bearing jobs (publish-*) do NOT get this exemption: corepack runs
 * AFTER setup-node there, so the flag is what keeps mode A away — every
 * parent v5 step carries the flag and the parent rule stays flag-only.
 *
 * DESIGN NOTES
 * ---------------------------------------------------------------------------
 *  * COUNTS, NOT PRESENCE. A workflow may contain several setup-node steps.
 *    This compares the number of `actions/setup-node@v5` occurrences against
 *    the number of guard occurrences, so a file with two steps and one guard
 *    FAILS. A presence-only check would pass it.
 *
 *  * ANCHORED KEY-LINE COUNTS. Guards are counted only where they appear as a
 *    YAML key line of their own — leading whitespace, the key, an optional
 *    inline `# comment`, end of line. Prose that merely MENTIONS the string
 *    inside a longer sentence, or a comment that quotes the error text, no
 *    longer counts toward the guard. Before bsuite#3150 the count was
 *    file-wide and comment-blind, so a prose mention could mask an unguarded
 *    step: the same miscounting trap the issue's own first census fell into
 *    (it counted `pnpm install` inside comments saying there isn't one). The
 *    census in the bsuite#3150 evidence verified, per real YAML parse, that
 *    on development the anchored count equals the per-step count (41/41) —
 *    so the file-level count below is exact, not approximate, on this tree.
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
 *  * BASELINE RATCHET (--scope mode only). The parent's CI checks out app
 *    submodules AT THE PINNED GITLINKS, which are app main heads — not app
 *    development tips. Two known pinned-main files still lack the flag while
 *    their fixes wait on promotion (crm7, business-suite-unified,
 *    control-boundary-contrast.yml). scripts/setup-node-guard-baseline.json
 *    records exactly those. The ratchet bites in BOTH directions: a violation
 *    not in the baseline fails, and a baseline entry that no longer matches
 *    any violation also fails — entries must be DELETED once the apps promote
 *    and the parent gitlinks advance, and may never be edited or grown.
 *
 * Exit 0 = every setup-node@v5 step is guarded.
 * Exit 1 = at least one is not, or the scan examined nothing.
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const WORKFLOW_DIR = '.github/workflows';
// Real `uses:` key lines only. A comment that MENTIONS "uses: actions/setup-node@v5"
// must not inflate the step count — the census for bsuite#3150 verified every
// uses line in the estate is a bare key line (no trailing comment, no
// comment-led uses), and this anchor keeps it that way.
const SETUP_NODE = /^[ \t]*(?:-[ \t]+)?uses:[ \t]*actions\/setup-node@v5[ \t]*(?:#[^\n]*)?[ \t]*$/gm;
// A key line: optional leading whitespace, the key, `false`, an optional
// trailing comment, end of line. Prose mentions inside longer lines do not
// count — see DESIGN NOTES.
const GUARD = /^[ \t]*package-manager-cache:[ \t]*false[ \t]*(?:#[^\n]*)?[ \t]*$/gm;
// The explicit-cache form, as a key line of its own.
const EXPLICIT_CACHE = /^[ \t]*cache:[ \t]*['"]?pnpm['"]?[ \t]*(?:#[^\n]*)?[ \t]*$/gm;
// pnpm/action-setup, as a real `uses:` line (not prose).
const ACTION_SETUP = /^[ \t]*(?:-[ \t]+)?uses:[ \t]*pnpm\/action-setup@[^\s#]+[ \t]*(?:#[^\n]*)?[ \t]*$/gm;
// A real install script line: the indented body of a run: block, either as a
// block-scalar line (`    pnpm install …`) or an inline run (`    run: pnpm install …`).
// A comment line cannot match: the optional `run:` prefix and the key itself
// must sit where a `#` would break the match — which is precisely the trap the
// issue's own census fell into (it counted "No `pnpm install` step" prose).
const PNPM_INSTALL = /^[ \t]*(?:-[ \t]+)?(?:run:[ \t]*)?pnpm[ \t]+install\b/m;
const APPS = [
  'crm7',
  'conduit',
  'business-suite-unified',
  'throughput',
  'braden',
  'R80.4',
];

/** A floor, not a guess: this estate had 22 setup-node@v5 steps on 2026-08-21.
 *  A scan that suddenly sees far fewer is broken, not clean. */
const MIN_EXPECTED_STEPS = 10;

/** In --scope mode, all six apps must be scanned. Fewer means the submodule
 *  checkout or the argument list is broken — a scan of nothing is not a pass. */
const MIN_EXPECTED_APPS = 6;

function countMatches(text, re) {
  return (text.match(re) ?? []).length;
}

function firstMatchLine(text, re) {
  const m = re.exec(text);
  if (!m) return null;
  return text.slice(0, m.index).split('\n').length;
}

/**
 * One file. Returns { steps, guarded } where guarded counts v5 steps that
 * carry the flag or (app mode only) the full install-bearing form.
 */
function scanFile(text, allowInstallForm) {
  const steps = countMatches(text, SETUP_NODE);
  if (steps === 0) return { steps: 0, guarded: 0 };

  const flags = countMatches(text, GUARD);
  let guarded = Math.min(flags, steps);

  if (allowInstallForm && guarded < steps) {
    // The install-bearing form, as a FILE-LEVEL proxy. The estate's
    // install-bearing files are homogeneous (one setup-node step per file,
    // pnpm/action-setup immediately before it) — measured in the bsuite#3150
    // census. A file qualifies only when counts pair FULLY and order holds
    // AND a real install line exists; all three are required, so prose
    // mentions alone cannot satisfy any of them, and leftover flags cannot
    // mask an unguarded step (full pairing, not deficit pairing).
    const caches = countMatches(text, EXPLICIT_CACHE);
    const setups = countMatches(text, ACTION_SETUP);
    const firstSetupNode = firstMatchLine(text, SETUP_NODE);
    const firstActionSetup = firstMatchLine(text, ACTION_SETUP);
    const hasInstall = PNPM_INSTALL.test(text);
    if (
      hasInstall &&
      caches >= steps &&
      setups >= steps &&
      firstActionSetup !== null &&
      firstSetupNode !== null &&
      firstActionSetup < firstSetupNode
    ) {
      guarded = steps;
    }
  }
  return { steps, guarded };
}

function scanDir(dir, allowInstallForm) {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith('.yml') || f.endsWith('.yaml'),
  );
  if (files.length === 0) {
    console.error(
      `FAIL: no workflow files in ${dir}. A scan of nothing is not a pass.`,
    );
    process.exit(1);
  }
  const offenders = [];
  let filesUsingSetupNode = 0;
  let stepsSeen = 0;
  let stepsGuarded = 0;

  for (const file of files.sort()) {
    const text = readFileSync(join(dir, file), 'utf8');
    const { steps, guarded } = scanFile(text, allowInstallForm);
    if (steps === 0) continue;
    filesUsingSetupNode += 1;
    stepsSeen += steps;
    stepsGuarded += guarded;
    if (guarded < steps) {
      offenders.push({ file, steps, guards: guarded });
    }
  }
  return { dir, files: files.length, filesUsingSetupNode, stepsSeen, stepsGuarded, offenders };
}

function loadBaseline() {
  const path = 'scripts/setup-node-guard-baseline.json';
  if (!existsSync(path)) return { entries: [] };
  return JSON.parse(readFileSync(path, 'utf8'));
}

function runParentMode() {
  if (!existsSync(WORKFLOW_DIR)) {
    console.error(`FAIL: ${WORKFLOW_DIR} does not exist - run from the repo root.`);
    process.exit(1);
  }
  const r = scanDir(WORKFLOW_DIR, false);

  if (r.stepsSeen === 0) {
    console.error(
      `FAIL: scanned ${r.files} workflow files and found ZERO ` +
        `actions/setup-node@v5 steps. Implausible for this repo - the scan is ` +
        `broken, not the workflows.`,
    );
    process.exit(1);
  }
  if (r.stepsSeen < MIN_EXPECTED_STEPS) {
    console.error(
      `FAIL: only ${r.stepsSeen} setup-node@v5 steps found across ${r.files} ` +
        `files; expected at least ${MIN_EXPECTED_STEPS}. Scan scope looks wrong.`,
    );
    process.exit(1);
  }
  report(r, 'FAIL');
}

function runAppMode(scopes) {
  for (const app of scopes) {
    if (!APPS.includes(app)) {
      console.error(`FAIL: unknown scope '${app}' — known apps: ${APPS.join(', ')}`);
      process.exit(1);
    }
  }
  if (scopes.length < MIN_EXPECTED_APPS) {
    console.error(
      `FAIL: ${scopes.length} app(s) requested; expected all ${MIN_EXPECTED_APPS} ` +
        `(${APPS.join(', ')}). A partial scan hides the apps it skipped.`,
    );
    process.exit(1);
  }

  const baseline = loadBaseline();
  const allOffenders = [];
  const lines = [];

  for (const app of scopes) {
    const dir = join(app, WORKFLOW_DIR);
    if (!existsSync(dir)) {
      console.error(
        `FAIL: ${dir} does not exist. The app submodules are not checked out — ` +
          `refusing to report a clean estate from a tree that scanned nothing.`,
      );
      process.exit(1);
    }
    const r = scanDir(dir, true);
    if (r.stepsSeen === 0) {
      lines.push(`ok - ${app}: 0 setup-node@v5 steps in ${r.files} workflow files (nothing to guard).`);
      continue;
    }
    for (const o of r.offenders) {
      allOffenders.push({ app, ...o });
    }
    lines.push(
      `${r.offenders.length === 0 ? 'ok' : '!!'} - ${app}: ${r.stepsGuarded}/${r.stepsSeen} ` +
        `setup-node@v5 steps guarded across ${r.filesUsingSetupNode} files (${r.files} scanned).`,
    );
  }

  // Ratchet, both directions: baseline entries must match a live violation,
  // and every live violation must be in the baseline. Baseline files are
  // recorded app-relative; offenders carry the basename — normalize to the
  // basename for the comparison (workflow filenames are unique per app dir).
  const baseName = (p) => String(p).split('/').pop();
  const key = (o) => `${o.app}/${baseName(o.file)}`;
  const live = new Map(allOffenders.map((o) => [key(o), o]));
  const stale = baseline.entries.filter((b) => !live.has(`${b.app}/${baseName(b.file)}`));
  const fresh = allOffenders.filter((o) => {
    const b = baseline.entries.find(
      (x) => x.app === o.app && baseName(x.file) === baseName(o.file),
    );
    return !b || b.steps !== o.steps || b.guards !== o.guards;
  });

  for (const l of lines) console.log(l);

  if (fresh.length > 0) {
    console.error(
      `\nFAIL: ${fresh.length} NEW unguarded setup-node@v5 step(s) not covered by ` +
        `scripts/setup-node-guard-baseline.json. Add package-manager-cache: false ` +
        `(or, in an install-bearing job, the pnpm/action-setup + cache: 'pnpm' form) ` +
        `to each — see bsuite#3150:`,
    );
    for (const o of fresh) {
      console.error(
        `  ${o.app}/${o.file} - ${o.steps} setup-node step(s), ${o.guards} guarded`,
      );
    }
    process.exit(1);
  }
  if (stale.length > 0) {
    console.error(
      `\nFAIL: ${stale.length} baseline entr(ies) no longer match any violation — ` +
        `the guarded apps have been fixed or promoted. The ratchet only tightens: ` +
        `DELETE these entries from scripts/setup-node-guard-baseline.json now:`,
    );
    for (const b of stale) {
      console.error(`  ${b.app}/${b.file} (steps=${b.steps}, guards=${b.guards})`);
    }
    process.exit(1);
  }
  if (allOffenders.length > 0) {
    console.log(
      `ok - ${allOffenders.length} known pinned-main offender(s) remain, exactly as ` +
        `recorded in the baseline; nothing new, nothing stale.`,
    );
  }
}

function report(r, failWord) {
  if (r.offenders.length > 0) {
    console.error(
      `${failWord}: ${r.offenders.length} workflow file(s) use actions/setup-node@v5 ` +
        `without package-manager-cache: false on every step.\n`,
    );
    for (const { file, steps, guards } of r.offenders) {
      console.error(
        `  ${file} - ${steps} setup-node step(s), ${guards} guarded`,
      );
    }
    console.error(
      `\nsetup-node@v5 defaults package-manager-cache to true. With a ` +
        `packageManager field in package.json that cache engages even without ` +
        `a cache: input, and without pnpm on PATH or a package-manager store ` +
        `on disk it fails twice: at setup time with "Unable to locate ` +
        `executable file: pnpm" (actions/setup-node#1363) or in the post step ` +
        `with "Path Validation Error" on lockfile-changing PRs (bsuite#3150). ` +
        `The fix is the same for both:\n` +
        `Add to each setup-node step's \`with:\` block:\n\n` +
        `          package-manager-cache: false\n`,
    );
    process.exit(1);
  }
  console.log(
    `ok - ${r.stepsGuarded}/${r.stepsSeen} actions/setup-node@v5 steps guarded with ` +
      `package-manager-cache: false across ${r.filesUsingSetupNode} workflow files ` +
      `(${r.files} scanned).`,
  );
}

function main() {
  const args = process.argv.slice(2);
  const scopes = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--scope') {
      scopes.push(args[i + 1]);
      i++;
    }
  }
  if (scopes.length > 0) {
    runAppMode(scopes);
  } else {
    runParentMode();
  }
}

main();