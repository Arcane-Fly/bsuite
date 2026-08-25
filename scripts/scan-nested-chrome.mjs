#!/usr/bin/env node
/**
 * G0 — the estate-wide nested-chrome (V-C5) scan.
 *
 * `PageGridLayout` paints every grid item as a card. When the slot's own
 * content re-declares that surface, the user sees a card inside a card:
 * mismatched corners and a doubled 1px edge. `glued-widget` (V-C4) cannot see
 * it — ONE card in ONE slot is not glue.
 *
 * This script is the FAIL-FIRST proof for the grid-item chrome inversion. It
 * is expected to REPORT FINDINGS on a pre-inversion tree; a run that reports
 * zero against a known-broken estate has proved the detector is broken, not
 * that the estate is clean.
 *
 * Usage:
 *   node scripts/scan-nested-chrome.mjs                 # report
 *   node scripts/scan-nested-chrome.mjs --json          # machine-readable
 *   node scripts/scan-nested-chrome.mjs --gate          # exit 1 on findings/UNKNOWNs
 *   node scripts/scan-nested-chrome.mjs --root <path>   # scan another checkout
 *   node scripts/scan-nested-chrome.mjs --app crm7      # one app only
 *
 * D-92: an app whose scan roots are missing, or whose scan reads zero files,
 * FAILS. It is never silently skipped, because a scanner that skips an app
 * reports a LOW count — a false pass, which is worse than a failure.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const ROOT = resolve(opt('--root', REPO));
const ONLY = opt('--app', null);

const scannerEntry = join(REPO, 'packages/page-builder/dist/scanner/index.js');
if (!existsSync(scannerEntry)) {
  console.error(
    `[scan-nested-chrome] ${scannerEntry} is missing.\n` +
      `Build it first: pnpm --filter @bsuite/page-builder build\n` +
      `Refusing to report a verdict from a scanner that is not there.`,
  );
  process.exit(2);
}
const { scanCardSurfaces } = await import(scannerEntry);

/**
 * Per-app operational truth. Scan roots and card vocabulary differ materially
 * between apps; the DETECTION LOGIC does not, and lives in the package.
 */
const APPS = [
  { app: 'crm7', scanRoots: ['src'], cardTags: ['Card', 'StatCard', 'SummaryCard'] },
  {
    app: 'business-suite-unified',
    scanRoots: ['src'],
    cardTags: ['Card', 'StatCard', 'ServiceCard', 'MagicCard'],
  },
  { app: 'conduit', scanRoots: ['src'], cardTags: ['Card', 'SummaryCard', 'CounterCard'] },
  { app: 'braden', scanRoots: ['src'], cardTags: ['Card', 'StatCard'] },
  { app: 'throughput', scanRoots: ['src'], cardTags: ['Card', 'StatCard'] },
  { app: 'R80.4', scanRoots: ['src'], cardTags: ['Card', 'StatCard'] },
];

const results = [];
let hardFailure = null;

for (const cfg of APPS) {
  if (ONLY && cfg.app !== ONLY) continue;
  const projectRoot = join(ROOT, cfg.app);
  if (!existsSync(projectRoot)) {
    hardFailure = `app "${cfg.app}" is not checked out at ${projectRoot}. A missing app reports a LOW count — a false pass.`;
    break;
  }
  let r;
  try {
    r = scanCardSurfaces({
      projectRoot,
      scanRoots: cfg.scanRoots,
      cardTags: cfg.cardTags,
      extensions: ['.tsx', '.ts'],
    });
  } catch (err) {
    hardFailure = `app "${cfg.app}" failed closed: ${err.message}`;
    break;
  }
  results.push({
    app: cfg.app,
    filesScanned: r.filesScanned,
    nested: r.nestedChromeFiles.length,
    unknown: r.unknownFiles.length,
    nestedFiles: r.nestedChromeFiles,
    unknownFiles: r.unknownFiles,
  });
}

if (hardFailure) {
  console.error(`[scan-nested-chrome] FAIL CLOSED: ${hardFailure}`);
  process.exit(2);
}

const totalNested = results.reduce((a, r) => a + r.nested, 0);
const totalUnknown = results.reduce((a, r) => a + r.unknown, 0);
const totalFiles = results.reduce((a, r) => a + r.filesScanned, 0);

if (flag('--json')) {
  console.log(JSON.stringify({ root: ROOT, totalFiles, totalNested, totalUnknown, results }, null, 2));
} else {
  console.log(`nested-chrome (V-C5) scan — root ${ROOT}\n`);
  console.log('app                        files    nested   UNKNOWN');
  for (const r of results)
    console.log(
      `${r.app.padEnd(24)} ${String(r.filesScanned).padStart(6)}   ${String(r.nested).padStart(6)}   ${String(r.unknown).padStart(7)}`,
    );
  console.log(
    `${'ESTATE'.padEnd(24)} ${String(totalFiles).padStart(6)}   ${String(totalNested).padStart(6)}   ${String(totalUnknown).padStart(7)}`,
  );
  console.log(
    `\nUNKNOWN means the file could not be parsed with confidence. It is NOT clean.\n` +
      `"checked nothing" and "found nothing" do not share an exit code here.`,
  );
}

if (flag('--gate')) {
  if (totalUnknown > 0) {
    console.error(`\nGATE FAIL: ${totalUnknown} file(s) UNKNOWN.`);
    process.exit(1);
  }
  if (totalNested > 0) {
    console.error(`\nGATE FAIL: ${totalNested} file(s) render a card inside the grid item's card.`);
    process.exit(1);
  }
  console.log('\nGATE PASS.');
}
