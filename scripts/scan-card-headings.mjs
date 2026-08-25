#!/usr/bin/env node
/**
 * G2 — which CARD headings carry the brand gradient, and which do not.
 *
 * The gradient was implemented as a PAGE-TITLE convention and shipped: 183 of
 * 232 crm7 `<h1>` page titles carry it. Card headings were never in scope —
 * 0 of 304 crm7 `<h2>`/`<h3>`. The work was done, declared complete, and
 * covered a different element than the one the operator keeps pointing at.
 *
 * This script exists because `<h2>` is NOT the same thing as "card heading".
 * There are 734 raw `<h2>`/`<h3>` across the estate and only 273 of them are
 * inside a card; a grep-driven sweep would have gradiented 461 headings nobody
 * asked about — dialog titles, empty-state titles, section labels, table
 * captions. A propagation without this number is a propagation that will be
 * corrected afterwards.
 *
 * Usage:
 *   node scripts/scan-card-headings.mjs                 # report
 *   node scripts/scan-card-headings.mjs --json          # machine-readable
 *   node scripts/scan-card-headings.mjs --list          # every heading, file:line
 *   node scripts/scan-card-headings.mjs --risky         # only the fit-content hazards
 *   node scripts/scan-card-headings.mjs --root <path>
 *
 * There is deliberately NO --gate mode yet. A gate that fails on 273 headings
 * before anyone has decided the sweep is correct is a gate that gets switched
 * off; it earns its exit code once the propagation lands.
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

const entry = join(REPO, 'packages/page-builder/dist/scanner/index.js');
if (!existsSync(entry)) {
  console.error(
    `[scan-card-headings] ${entry} is missing.\n` +
      `Build it first: pnpm --filter @bsuite/page-builder build`,
  );
  process.exit(2);
}
const { scanCardHeadings } = await import(entry);

const CHROME = [
  'Card', 'MagicCard', 'GlassCard', 'NeonCard', 'StatCard',
  'SummaryCard', 'ServiceCard', 'CounterCard', 'MetricCard', 'InfoCard',
];

const APPS = [
  { app: 'crm7', cardTags: ['Card', 'StatCard', 'SummaryCard'] },
  { app: 'business-suite-unified', cardTags: ['Card', 'StatCard', 'ServiceCard', 'MagicCard'] },
  { app: 'conduit', cardTags: ['Card', 'SummaryCard', 'CounterCard'] },
  { app: 'braden', cardTags: ['Card', 'StatCard'] },
  { app: 'throughput', cardTags: ['Card', 'StatCard'] },
  { app: 'R80.4', cardTags: ['Card', 'StatCard'] },
];

const results = [];
for (const cfg of APPS) {
  const projectRoot = join(ROOT, cfg.app);
  if (!existsSync(projectRoot)) {
    // D-92: a missing app reports a LOW count. That is a false pass, and a
    // false pass is worse than a failure.
    console.error(
      `[scan-card-headings] FAIL CLOSED: app "${cfg.app}" is not checked out at ${projectRoot}.`,
    );
    process.exit(2);
  }
  const r = scanCardHeadings({
    projectRoot,
    scanRoots: ['src'],
    cardTags: cfg.cardTags,
    nestedChromeTags: CHROME,
  });
  results.push({ app: cfg.app, ...r });
}

const total = (fn) => results.reduce((a, r) => a + fn(r), 0);
const missing = (r) => r.findings.filter((f) => !f.hasGradient);
const risky = (r) => missing(r).filter((f) => f.widthDependentClasses.length > 0);

if (flag('--json')) {
  console.log(JSON.stringify(results, null, 2));
} else if (flag('--list') || flag('--risky')) {
  for (const r of results)
    for (const f of flag('--risky') ? risky(r) : missing(r))
      console.log(
        `${r.app}/${f.file}:${f.line}  <${f.tag}>` +
          (f.widthDependentClasses.length ? `  RISKY[${f.widthDependentClasses.join(' ')}]` : ''),
      );
} else {
  console.log('app                      cardHeadings  gradient  missing  RISKY  UNKNOWN');
  for (const r of results)
    console.log(
      `${r.app.padEnd(24)} ${String(r.findings.length).padStart(11)} ` +
        `${String(r.findings.length - missing(r).length).padStart(9)} ` +
        `${String(missing(r).length).padStart(8)} ${String(risky(r).length).padStart(6)} ` +
        `${String(r.unknownFiles.length).padStart(8)}`,
    );
  console.log(
    `${'ESTATE'.padEnd(24)} ${String(total((r) => r.findings.length)).padStart(11)} ` +
      `${String(total((r) => r.findings.length - missing(r).length)).padStart(9)} ` +
      `${String(total((r) => missing(r).length)).padStart(8)} ` +
      `${String(total((r) => risky(r).length)).padStart(6)} ` +
      `${String(total((r) => r.unknownFiles.length)).padStart(8)}`,
  );
  console.log(
    `\nRISKY = the heading carries truncate / flex-1 / w-full / line-clamp-*, which\n` +
      `fight the \`width: fit-content\` that makes background-clip:text render at all.\n` +
      `Those need a decision, not a codemod.\n` +
      `UNKNOWN = the file's JSX tags did not balance (TypeScript generics read as tags).\n` +
      `An UNKNOWN is NOT a clean file.`,
  );
}
