#!/usr/bin/env node
/**
 * semgrep-sast.mjs — static application security analysis across the estate,
 * as a shrinking ratchet.
 *
 * WHY NOT CODEQL, WHICH IS WHAT THE PLAN ASKED FOR
 * ---------------------------------------------------------------------------
 * The backlog item said: enable GitHub code scanning on bsuite, crm7 and
 * business-suite-unified via
 *   gh api -X PATCH repos/<r>/code-scanning/default-setup -f state=configured
 *
 * That returns 403 on all three, and the reason is not a config gap:
 *
 *   PATCH /repos/GaryOcean428/crm7 {security_and_analysis:{advanced_security:{status:"enabled"}}}
 *   -> 422 "Advanced security has not been purchased."
 *
 * All six app repos are PRIVATE and owned by a personal account. GitHub's own
 * docs are explicit that the CodeQL CLI "is free to use on public repositories"
 * and on private repositories only for organisations "that use GitHub Team or
 * GitHub Enterprise Cloud and have a license for GitHub Code Security".
 *
 * So running CodeQL here would be a LICENCE VIOLATION, not merely an
 * unsupported configuration. There is no workaround worth having: uploading
 * SARIF to the code-scanning API is gated behind the same purchase, and running
 * the CLI without one breaks its terms. Whether to buy Code Security is a spend
 * decision and belongs to the operator.
 *
 * Semgrep Community Edition is the correctly-licensed substitute. The engine is
 * LGPL-2.1 — free to run on private, proprietary code including in CI — and the
 * Semgrep Registry rules are free for internal business use, which is exactly
 * this estate's use (internal; not redistributed, not resold, not embedded in a
 * competing product). Verified against both vendors' current licence pages
 * before this file was written, not from memory.
 *
 * WHY GITIGNORE IS RESPECTED, AND WHY THAT IS A SECURITY REQUIREMENT
 * ---------------------------------------------------------------------------
 * The first exploratory sweep passed `--no-git-ignore` and duly reported five
 * "detected-generic-api-key" and "detected-jwt-token" hits across
 * `R80.4/.env`, `R80.4/.env.local`, `business-suite-unified/.env.local` and
 * `business-suite-unified/.vercel/.env.development.local`.
 *
 * Every one of those files is UNTRACKED and gitignored — checked with
 * `git ls-files --error-unmatch` and `git check-ignore -v`, not by reading
 * .gitignore. They are the operator's local credentials. Nothing is committed.
 *
 * That makes `--no-git-ignore` actively wrong for a CI gate on two counts: it
 * reports developer-local files as repository findings, and semgrep prints
 * matched lines, so a gate configured that way could print live secrets into a
 * CI log. This file therefore never passes that flag, and the omission is
 * load-bearing rather than incidental.
 *
 * Secrets that ARE committed remain covered by gitleaks, which every app repo
 * already runs and which scans history rather than the worktree. The two tools
 * do not overlap and neither replaces the other.
 *
 * WHY A RATCHET RATHER THAN A CLEAN GATE
 * ---------------------------------------------------------------------------
 * Same idiom as the estate's other ratchets: introduce a stricter gate without
 * breaking every open PR on day one. The baseline records the ERROR count each
 * app carried when the gate landed, WITH a `_note` per app naming what those
 * findings actually are. An unnoted number is a number nobody can act on.
 *
 * The ratchet only shrinks: exceeding the baseline fails, and coming in under
 * it prints a notice telling you to re-run with --update. A baseline that
 * silently absorbs improvements stops being evidence of anything.
 *
 * SELF-REPORTING (bsuite LANE-WATCHER, scripts/check-guard-self-reporting.mjs)
 * ---------------------------------------------------------------------------
 * A clean pass prints a NON-ZERO count of files actually scanned. More than
 * that: scanning zero files is treated as a HARD FAILURE, never a pass. This
 * estate's single most-repeated bug is a guard that goes green having examined
 * nothing — an uninitialised submodule is an empty directory, and an empty
 * directory produces a flawless scan of nothing at all.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BASELINE_PATH = join(REPO_ROOT, 'scripts', 'semgrep-baseline.json')

/** The six deployed apps. The parent's own scripts/ are scanned as `bsuite`. */
const APPS = [
  'bsuite',
  'crm7',
  'conduit',
  'R80.4',
  'business-suite-unified',
  'braden',
  'throughput',
]

/**
 * `p/default` is Semgrep's curated cross-language security ruleset. Deliberately
 * ONE config: each additional ruleset multiplies scan time and, more to the
 * point, arrives with its own findings that would land in the baseline
 * untriaged. Widening the ruleset is a follow-up with its own triage pass, not
 * a free upgrade.
 */
const SEMGREP_CONFIG = 'p/default'

/** Build artefacts and vendored trees. Gitignore already covers most of this;
 *  these are belt-and-braces for the few that are checked in somewhere. */
const EXCLUDES = ['node_modules', 'dist', 'build', '.next', 'coverage', '.turbo', 'playwright-report']

function fail(msg) {
  console.error(`::error::${msg}`)
  process.exitCode = 1
}

function appPaths(app) {
  // The parent repo is scanned as its own first-party surface only — scanning
  // '.' would re-scan all six submodules under the parent's name and
  // double-count every finding.
  if (app === 'bsuite') {
    return ['scripts', '.github'].map((d) => join(REPO_ROOT, d)).filter(existsSync)
  }
  const dir = join(REPO_ROOT, app)
  return existsSync(dir) ? [dir] : []
}

function runSemgrep(paths) {
  const args = [
    'scan',
    '--config',
    SEMGREP_CONFIG,
    '--json',
    '--quiet',
    '--metrics=off',
    '--timeout',
    '30',
    // NOTE: --no-git-ignore is deliberately absent. See this file's header.
    ...EXCLUDES.flatMap((e) => ['--exclude', e]),
    ...paths,
  ]
  const out = execFileSync('semgrep', args, {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    // semgrep exits non-zero when it has findings; that is data, not an error.
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return JSON.parse(out)
}

function scanApp(app) {
  const paths = appPaths(app)
  if (paths.length === 0) {
    return { app, ok: false, reason: 'no source directory — submodule not checked out?' }
  }

  let report
  try {
    report = runSemgrep(paths)
  } catch (err) {
    // execFileSync throws on non-zero exit. semgrep uses exit 1 for "findings
    // present", which is normal; anything else is a real tool failure.
    if (err.status === 1 && err.stdout) {
      report = JSON.parse(err.stdout)
    } else {
      return { app, ok: false, reason: `semgrep failed (exit ${err.status}): ${String(err.stderr).slice(0, 400)}` }
    }
  }

  const scanned = report.paths?.scanned?.length ?? 0
  const results = report.results ?? []
  const errors = results.filter((r) => r.extra?.severity === 'ERROR')

  return {
    app,
    ok: true,
    scanned,
    errorCount: errors.length,
    warningCount: results.filter((r) => r.extra?.severity === 'WARNING').length,
    findings: errors.map((r) => ({
      rule: r.check_id.split('.').pop(),
      at: `${r.path}:${r.start.line}`,
    })),
  }
}

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return {}
  return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
}

// ── main ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2)
const update = argv.includes('--update')
const only = argv.includes('--app') ? argv[argv.indexOf('--app') + 1] : null
const targets = only ? [only] : APPS

if (only && !APPS.includes(only)) {
  fail(`unknown app '${only}'. Known: ${APPS.join(', ')}`)
  process.exit(1)
}

const baseline = loadBaseline()
const results = targets.map(scanApp)

let totalScanned = 0
let regressed = false
let improved = false

for (const r of results) {
  if (!r.ok) {
    fail(`${r.app}: ${r.reason}`)
    continue
  }

  // A scan of zero files is a FAILURE, never a pass. This is the estate's
  // most-repeated bug class and the reason this check exists at all.
  if (r.scanned === 0) {
    fail(
      `${r.app}: semgrep scanned 0 files. An empty scan is not a clean scan — ` +
        `this almost always means the submodule did not check out (see bsuite#1781, ` +
        `set BSUITE_CROSS_REPO_PAT with Contents:read on each app repo).`
    )
    continue
  }

  totalScanned += r.scanned
  const allowed = baseline[r.app]?.errors ?? 0

  const verdict =
    r.errorCount > allowed ? 'REGRESSED' : r.errorCount < allowed ? 'improved' : 'held'
  if (verdict === 'REGRESSED') regressed = true
  if (verdict === 'improved') improved = true

  console.log(
    `${r.app.padEnd(24)} scanned=${String(r.scanned).padStart(5)}  ` +
      `ERROR=${String(r.errorCount).padStart(3)} (baseline ${allowed})  ` +
      `WARNING=${String(r.warningCount).padStart(3)}  ${verdict}`
  )

  if (verdict === 'REGRESSED') {
    const known = new Set((baseline[r.app]?.findings ?? []).map((f) => `${f.rule}@${f.at}`))
    for (const f of r.findings) {
      const mark = known.has(`${f.rule}@${f.at}`) ? ' ' : '+'
      console.log(`  ${mark} ${f.rule.padEnd(34)} ${f.at}`)
    }
    fail(
      `${r.app}: ${r.errorCount} ERROR-severity findings exceeds the baseline of ${allowed}. ` +
        `Fix the new finding, or — if it is a false positive — add a nosemgrep comment ` +
        `WITH a reason and raise the baseline in the same commit.`
    )
  }
}

if (update) {
  const next = {}
  for (const r of results) {
    if (!r.ok || r.scanned === 0) continue
    next[r.app] = {
      errors: r.errorCount,
      _note: baseline[r.app]?._note ?? 'TODO: triage these findings and describe them here.',
      findings: r.findings,
    }
  }
  writeFileSync(BASELINE_PATH, `${JSON.stringify({ ...baseline, ...next }, null, 2)}\n`)
  console.log(`\nBaseline written to scripts/semgrep-baseline.json for ${Object.keys(next).length} app(s).`)
  console.log('Every app entry needs a real _note. An unnoted number is one nobody can act on.')
  process.exitCode = 0
} else {
  console.log(
    `\nsemgrep-sast: ${results.filter((r) => r.ok).length} app(s), ${totalScanned} file(s) scanned, ` +
      `config ${SEMGREP_CONFIG}.`
  )
  if (improved && !regressed) {
    console.log(
      '::notice::One or more apps came in UNDER baseline. Re-run with --update so the ratchet ' +
        'keeps its grip; a baseline that silently absorbs improvements stops being evidence.'
    )
  }
}
