#!/usr/bin/env node
/**
 * check-airtable-grid-adoption.mjs — a one-way ratchet on hand-rolled tables.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * THE OPERATOR ASK, AND WHY A RATCHET RATHER THAN A SWEEP
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Operator, 2026-08-28: "anything that is listed and presented in a table
 * SHOULD be in the airtable style". The estate already ships that grid --
 * `@bsuite/data-grid`, "virtualized, spreadsheet-feel ... cell range
 * selection, keyboard grid navigation, TSV clipboard round-trip, fill handle,
 * undo/redo". It is not missing. It is UNADOPTED.
 *
 * Measured 2026-08-28, the day this script was written:
 *
 *     DataGrid instances .................... 2
 *     hand-rolled <Table>/<table> instances . 215   (across 156 files)
 *
 * Two of 217. A single sweep converting 215 tables is not a safe change:
 * every one carries its own columns, its own row actions, its own empty and
 * loading states, and a batch codemod across that surface would ship a
 * hundred untested pages at once. So the ask is met the way a large backlog
 * is actually met -- convert deliberately, and make the number physically
 * unable to grow while that happens.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHY THE RATCHET IS TWO-WAY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * It fails on a RISE, which is the point: a new hand-rolled table is a new
 * page that will have to be converted later.
 *
 * It also fails on an UNBANKED FALL. A ratchet that silently accepts
 * improvement cannot tell "someone converted four tables" from "someone
 * deleted the file" or "my matcher stopped matching". This estate has been
 * bitten by exactly that: a gate reporting zero because it had gone blind,
 * not because the work was done. Banking the fall forces the number to be
 * looked at.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * WHAT THIS COUNTS, AND WHAT IT CANNOT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Counted: `<table` and `<Table` element opens in non-test, non-story
 * `.tsx` under each app's `src/`.
 *
 * NOT counted, and stated rather than hidden:
 *   - a table rendered by a shared component the app merely calls. The count
 *     is of RENDER SITES, so one shared table used by 20 pages counts once.
 *     That is the right unit for conversion work but it is NOT "how many
 *     pages show a hand-rolled table".
 *   - a grid built from divs with `role="table"`. If someone routes around
 *     this gate that way, the number will fall while nothing improves --
 *     which is precisely why an unbanked fall fails.
 *   - markdown or HTML tables in docs, deliberately.
 *
 * Read the numbers as "render sites a person must convert", nothing more.
 *
 * Usage:
 *   node scripts/check-airtable-grid-adoption.mjs            # verify
 *   node scripts/check-airtable-grid-adoption.mjs --update   # bank
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const BASELINE = join(HERE, 'airtable-grid-adoption-baseline.json');

const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput'];

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.vercel']);
const isCounted = (name) =>
  name.endsWith('.tsx') && !name.includes('.test.') && !name.includes('.spec.') && !name.includes('.stories.');

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(full, out);
    else if (isCounted(entry)) out.push(full);
  }
  return out;
}

/**
 * Count element opens. Deliberately NOT a regex over the whole file with a
 * lookbehind: `<Table` also prefixes `<TableRow`, `<TableCell`, `<TableHead`,
 * and counting those would inflate every file by an order of magnitude and
 * make the baseline meaningless. The character after the tag name must be a
 * boundary.
 */
function countTables(text) {
  let count = 0;
  for (const tag of ['table', 'Table']) {
    let index = text.indexOf(`<${tag}`);
    while (index !== -1) {
      const after = text[index + tag.length + 1];
      if (after === undefined || after === '>' || after === ' ' || after === '\n' || after === '\t') count += 1;
      index = text.indexOf(`<${tag}`, index + 1);
    }
  }
  return count;
}

function countDataGrid(text) {
  let count = 0;
  let index = text.indexOf('<DataGrid');
  while (index !== -1) {
    const after = text['<DataGrid'.length + index];
    if (after === undefined || after === '>' || after === ' ' || after === '\n' || after === '\t') count += 1;
    index = text.indexOf('<DataGrid', index + 1);
  }
  return count;
}

/*
 * Positive control, run in CI BEFORE the real count is believed.
 *
 * This ratchet's failure mode is silent and asymmetric: a tokeniser
 * regression reports a SMALLER number, and a smaller number on an adoption
 * ratchet reads like someone did the work. Proving the counter can still find
 * a table -- and still decline to count `<TableRow>`, which would inflate
 * every file by an order of magnitude -- has to happen before its output is
 * trusted.
 *
 * The fixtures are STRINGS, never files. A detector whose fixtures live on
 * disk trips every other detector in the estate; that has happened here
 * before, with one script producing 22 eslint errors and a gitleaks hit.
 */
if (process.argv.includes('--self-test')) {
  const cases = [
    ['<table>', 1, 'a bare lowercase table'],
    ['<table className="w-full">', 1, 'a table with props'],
    ['<Table>', 1, 'the shadcn Table'],
    ['<Table className="x">', 1, 'Table with props'],
    ['<TableRow><TableCell/></TableRow>', 0, 'row and cell must NOT count as tables'],
    ['<TableHeader><TableHead/></TableHeader>', 0, 'header parts must NOT count'],
    ['<TableBody>', 0, 'body must NOT count'],
    ['const Tables = 5', 0, 'an identifier that merely starts with Table'],
    ['<table>\n<table>', 2, 'two tables in one file'],
  ];
  let failed = 0;
  for (const [source, expected, why] of cases) {
    const got = countTables(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got} for ${JSON.stringify(source)}`);
      failed += 1;
    }
  }
  const gridCases = [
    ['<DataGrid columns={c} data={d} />', 1, 'a DataGrid render'],
    ['<DataGridToolbar/>', 0, 'a different component sharing the prefix'],
  ];
  for (const [source, expected, why] of gridCases) {
    const got = countDataGrid(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got}`);
      failed += 1;
    }
  }
  if (failed > 0) {
    console.error(`\nSELF-TEST FAILED (${failed}). The counter is broken; its numbers must not be believed.`);
    process.exit(2);
  }
  console.log(`self-test OK — ${cases.length + gridCases.length} controls, including ${cases.filter((c) => c[1] === 0).length} that must NOT count.`);
  process.exit(0);
}

const measured = {};
let examinedFiles = 0;
for (const app of APPS) {
  const src = join(ROOT, app, 'src');
  const files = walk(src);
  examinedFiles += files.length;
  let handRolled = 0;
  let dataGrid = 0;
  const sites = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const t = countTables(text);
    const d = countDataGrid(text);
    handRolled += t;
    dataGrid += d;
    if (t > 0) sites.push(relative(ROOT, file));
  }
  measured[app] = { handRolled, dataGrid, files: sites.length };
}

/*
 * A gate that cannot tell "clean" from "never looked at" is not a gate. If the
 * walk found no files at all, the app trees are absent (a bare checkout, a
 * submodule that was never initialised) and every count would read 0 --
 * indistinguishable from total success. Refuse instead.
 */
if (examinedFiles === 0) {
  console.error('FAIL: examined 0 files. App trees are missing — this is a blind run, not a clean one.');
  process.exit(2);
}

const updating = process.argv.includes('--update');

if (updating) {
  const banked = {
    _doc:
      'Banked counts of hand-rolled <table>/<Table> RENDER SITES per app, and DataGrid adoption. ' +
      'Written by scripts/check-airtable-grid-adoption.mjs --update. Fails on any RISE (a new hand-rolled ' +
      'table is a page someone must convert later) and on any UNBANKED FALL (so a matcher that goes blind ' +
      'cannot read as progress). Operator ask 2026-08-28: every table should be in the Airtable style.',
    _measured: `${examinedFiles} .tsx files examined across ${APPS.length} apps`,
    apps: measured,
  };
  writeFileSync(BASELINE, `${JSON.stringify(banked, null, 2)}\n`);
  console.log(`banked: ${JSON.stringify(measured)}`);
  process.exit(0);
}

let baseline;
try {
  baseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  console.error(`FAIL: no baseline at ${relative(ROOT, BASELINE)}. Run with --update to bank the current counts.`);
  process.exit(2);
}

const problems = [];
for (const app of APPS) {
  const now = measured[app];
  const was = baseline.apps?.[app];
  if (!was) {
    problems.push(`${app}: not in the baseline. Run --update.`);
    continue;
  }
  if (now.handRolled > was.handRolled) {
    problems.push(
      `${app}: hand-rolled tables ROSE ${was.handRolled} -> ${now.handRolled}. ` +
        'Use <DataGrid> from @bsuite/data-grid (columns can be editable:false for a read-only listing).',
    );
  } else if (now.handRolled < was.handRolled) {
    problems.push(
      `${app}: hand-rolled tables FELL ${was.handRolled} -> ${now.handRolled} without being banked. ` +
        'If you converted them, run --update. If you did not, this gate has gone blind — find out which.',
    );
  }
}

const totalNow = APPS.reduce((sum, a) => sum + measured[a].handRolled, 0);
const gridNow = APPS.reduce((sum, a) => sum + measured[a].dataGrid, 0);

if (problems.length > 0) {
  console.error('Airtable-style grid adoption ratchet FAILED:\n');
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\nExamined ${examinedFiles} .tsx files. hand-rolled=${totalNow} DataGrid=${gridNow}`);
  process.exit(1);
}

console.log(
  `Airtable-style grid adoption OK — examined ${examinedFiles} .tsx files; ` +
    `hand-rolled tables ${totalNow} (baseline holds), DataGrid ${gridNow}.`,
);
