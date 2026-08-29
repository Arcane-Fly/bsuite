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
/*
 * The tree to scan. Normally the repo this script lives in.
 *
 * `AIRTABLE_GRID_SCAN_ROOT` overrides it, and exists for one specific job: the
 * apps are SUBMODULES, so CI scans whatever the gitlinks point at, while a
 * developer's checkout has each app on some feature branch. Those are different
 * trees, and a baseline banked from the second is a floor the first can never
 * meet — this estate has already banked a ratchet at a number measured against
 * the wrong tree and spent weeks reading a red gate as merely red.
 *
 * Point it at a directory of the apps checked out at their gitlink SHAs to bank
 * numbers CI can actually reproduce. The BASELINE path is deliberately NOT
 * affected: the baseline belongs to the repo, not to the tree being measured.
 */
const ROOT = process.env.AIRTABLE_GRID_SCAN_ROOT
  ? resolve(process.env.AIRTABLE_GRID_SCAN_ROOT)
  : resolve(HERE, '..');
const BASELINE = join(HERE, 'airtable-grid-adoption-baseline.json');

const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput'];

const ROW_TAGS = ['<TableRow', '<tr'];
const TAG_DELIMITERS = new Set([' ', '\n', '\t', '\r', '>', '/']);

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
/*
 * What may follow a component name and still be that component.
 *
 * `<` is in this set for GENERIC TYPE ARGUMENTS — `<DataGrid<AuditRow>`. Its
 * absence made the counter blind to four of the five DataGrid render sites in
 * crm7, which is how a tree with five converted pages reported one.
 *
 * That was not merely a wrong statistic. `usesDataGrid()` gates the
 * click-through check, so a protected file converted with a generic parameter
 * read as "not converted" and skipped the check entirely — the gate would have
 * stayed silent on exactly the loss it exists to catch. `<Table<Row>` is the
 * same shape, so both counters use the same set.
 *
 * `s` is deliberately NOT here: `<Tables` is a different component.
 */
const NAME_DELIMITERS = new Set([undefined, '>', ' ', '\n', '\t', '\r', '/', '<']);

function countTables(text) {
  let count = 0;
  for (const tag of ['table', 'Table']) {
    let index = text.indexOf(`<${tag}`);
    while (index !== -1) {
      if (NAME_DELIMITERS.has(text[index + tag.length + 1])) count += 1;
      index = text.indexOf(`<${tag}`, index + 1);
    }
  }
  return count;
}

function countDataGrid(text) {
  let count = 0;
  let index = text.indexOf('<DataGrid');
  while (index !== -1) {
    if (NAME_DELIMITERS.has(text['<DataGrid'.length + index])) count += 1;
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
    ['<Table<Row> columns={c}>', 1, 'a generic type argument on Table'],
    ['<Tables>', 0, 'a DIFFERENT component whose name merely starts with Table'],
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
    ['<DataGrid<AuditRow>\n  columns={c}\n/>', 1, 'a GENERIC type argument — four of five real render sites look like this'],
    ['<DataGrid/>', 1, 'a self-closing render'],
  ];
  for (const [source, expected, why] of gridCases) {
    const got = countDataGrid(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got}`);
      failed += 1;
    }
  }

  /*
   * The click-through detector had no controls at all until 2026-08-28, which
   * is how it came to be defined and never called. A detector nobody tested is
   * the one most likely to be silently inert.
   *
   * The negative controls matter more than the positive ones here: an onClick
   * on a CELL, or on a button inside a row, is not row-level click-through, and
   * counting it would bank files into the protected set that never had the
   * capability — making the gate fail later for a navigation that never existed.
   */
  const clickCases = [
    ['<TableRow onClick={() => go(id)}>', true, 'onClick directly on the row'],
    ['<TableRow className="cursor-pointer" onClick={f}>', true, 'cursor-pointer AND onClick'],
    ['<TableRow className="cursor-pointer">', true, 'cursor-pointer alone still signals an interactive row'],
    ['<TableRow>\n<TableCell onClick={f}/>\n</TableRow>', false, 'onClick on a CELL is not row-level'],
    ['<TableRow>\n<Button onClick={f}/>\n</TableRow>', false, 'a button inside a row is not row-level'],
    [
      '<TableRow onMouseEnter={() => hover(id)} onClick={open}>',
      true,
      'an arrow function in an EARLIER prop must not truncate the tag at the > of =>',
    ],
    ['<TableRow onClick={() => go(id)}>', true, 'an arrow function in the onClick itself'],
    ['<tr onClick={open}>', true, 'a plain <tr> row is click-through too'],
    ['<tr className="cursor-pointer">', true, 'a plain <tr> marked interactive'],
    ['<tr>\n<td onClick={f}/>\n</tr>', false, 'onClick on a <td> is not row-level'],
    ['<track onClick={f}/>', false, '<track> must not be read as <tr>'],
    ['<tr>', false, 'a plain non-interactive <tr>'],
    ['<TableRow>', false, 'a plain row'],
    ['<div onClick={f}>', false, 'a div outside any table'],
  ];
  for (const [source, expected, why] of clickCases) {
    const got = hasRowLevelClickThrough(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got}`);
      failed += 1;
    }
  }

  // The conversion check itself: a converted file WITHOUT onRowClick is the
  // regression this whole mechanism exists to catch.
  const convCases = [
    ['<DataGrid columns={c} data={d} onRowClick={open} />', true, 'converted AND keeps click-through'],
    ['<DataGrid columns={c} data={d} />', false, 'converted and DROPPED click-through'],
    [
      '<DataGrid columns={c} data={d} />\n// wiring onRowClick matters here',
      false,
      'a COMMENT mentioning onRowClick must NOT satisfy the check — it did, and shipped green',
    ],
    ['<DataGrid onRowClick = {open} />', true, 'whitespace before the = is still a binding'],
  ];
  for (const [source, expected, why] of convCases) {
    const got = usesDataGrid(source) && hasRowClick(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got}`);
      failed += 1;
    }
  }
  if (failed > 0) {
    console.error(`\nSELF-TEST FAILED (${failed}). The counter is broken; its numbers must not be believed.`);
    process.exit(2);
  }
  const negatives =
    cases.filter((c) => c[1] === 0).length +
    gridCases.filter((c) => c[1] === 0).length +
    clickCases.filter((c) => c[1] === false).length +
    convCases.filter((c) => c[1] === false).length;
  console.log(
    `self-test OK — ${cases.length + gridCases.length + clickCases.length + convCases.length} controls, ` +
      `including ${negatives} that must NOT count.`,
  );
  process.exit(0);
}

/*
 * CLICK-THROUGH MUST SURVIVE THE CONVERSION.
 *
 * Operator, 2026-08-28: "make sure table that currently enable click through
 * to a record still maintain this capability."
 *
 * A hand-rolled table opens its record with `<TableRow onClick>`. Converting
 * that table to a grid without wiring `onRowClick` silently turns a working
 * navigation into a dead list — and it reads as PROGRESS on the adoption
 * count, because the table did move onto the grid. The ratchet would applaud
 * a regression.
 *
 * So the files that had row-level click-through are recorded, and any of them
 * that renders a DataGrid must also pass onRowClick. Recorded by PATH rather
 * than re-derived, because once a file is converted the `<TableRow onClick>`
 * evidence is GONE — a detector that recomputes the list would forget the file
 * ever had the capability, which is precisely when it needs to remember.
 */
function usesDataGrid(text) {
  return countDataGrid(text) > 0;
}
/*
 * The PROP, not the word.
 *
 * This was `text.includes('onRowClick')`, and a comment EXPLAINING why the prop
 * matters satisfied it. Caught 2026-08-29 by a positive control on the first
 * real conversion: I removed the prop, left the comment, and the gate passed —
 * so a converted file could lose its navigation, keep the note about not losing
 * it, and ship green. That is the exact defect this check exists to catch,
 * hiding inside the check.
 *
 * A JSX prop is `onRowClick=` (with optional whitespace); prose is not. Fifth
 * time in this estate that a matcher has fired on prose about its own token.
 */
function hasRowClick(text) {
  let i = text.indexOf('onRowClick');
  while (i !== -1) {
    // skip whitespace, then require `=` — the JSX binding, not a mention
    let j = i + 'onRowClick'.length;
    while (j < text.length && (text[j] === ' ' || text[j] === '\n' || text[j] === '\t')) j += 1;
    if (text[j] === '=') return true;
    i = text.indexOf('onRowClick', i + 1);
  }
  return false;
}
/*
 * The OPENING TAG of the element starting at `from`, or '' if it never closes.
 *
 * Naively taking everything up to the first `>` is wrong, and wrong in the
 * direction that loses data: in
 *
 *     <TableRow onMouseEnter={() => hover(id)} onClick={open}>
 *
 * the first `>` is the one in `=>`, so the naive slice stops at
 * `<TableRow onMouseEnter={() =` and the onClick is never seen. The row reads
 * as non-interactive, never enters the protected set, and a later conversion
 * drops its navigation with nothing to object. An arrow function in a prop
 * BEFORE the onClick is ordinary React, not a corner case.
 *
 * So track brace depth and close the tag only at a `>` outside any `{...}`.
 */
function openingTag(text, from) {
  let depth = 0;
  for (let i = from; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    else if (ch === '>' && depth === 0) return text.slice(from, i);
  }
  return '';
}

/*
 * BOTH row elements, because the estate uses both.
 *
 * `<TableRow>` is the shadcn component; `<tr>` is the plain element used by the
 * hand-rolled `<table>`s. Checking only the first looked complete — crm7 is
 * almost entirely shadcn — and missed NINE files with working row click-through
 * (four in crm7, five in business-suite-unified, whose 28 hand-rolled tables
 * contain no `<TableRow>` at all). A gate is only as good as its narrowest
 * axis, and a protected set that silently excludes an entire element is the
 * narrow axis pretending to be the whole sweep.
 *
 * The `<tr` scan must not match `<track`, so require a delimiter after it.
 */
function hasRowLevelClickThrough(text) {
  // ROW-level only: an onClick on a cell, or on a button inside the row, is a
  // different control, and banking it would protect a navigation that never
  // existed — so the gate would later fail over a loss that never happened.
  for (const tagName of ROW_TAGS) {
    let i = text.indexOf(tagName);
    while (i !== -1) {
      const next = text[i + tagName.length];
      if (next !== undefined && TAG_DELIMITERS.has(next)) {
        const tag = openingTag(text, i);
        if (tag.includes('onClick') || tag.includes('cursor-pointer')) return true;
      }
      i = text.indexOf(tagName, i + 1);
    }
  }
  return false;
}

const measured = {};
const clickThroughByApp = {};
let examinedFiles = 0;
for (const app of APPS) {
  const src = join(ROOT, app, 'src');
  const files = walk(src);
  examinedFiles += files.length;
  let handRolled = 0;
  let dataGrid = 0;
  const sites = [];
  const clickThrough = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const t = countTables(text);
    const d = countDataGrid(text);
    handRolled += t;
    dataGrid += d;
    if (t > 0) sites.push(relative(ROOT, file));
    if (hasRowLevelClickThrough(text)) clickThrough.push(relative(ROOT, file));
  }
  measured[app] = { handRolled, dataGrid, files: sites.length };
  clickThroughByApp[app] = clickThrough.sort();
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

// Read first: --update needs the prior baseline to union the protected set, and
// a missing one on a verify run is a hard failure below rather than a silent 0.
let existingBaseline = null;
try {
  existingBaseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  existingBaseline = null;
}

/*
 * THE PROTECTED SET IS A UNION, NEVER AN OVERWRITE.
 *
 * `hasRowLevelClickThrough` can only see a file that still renders
 * `<TableRow>`. The moment a file is converted the evidence is gone and the
 * measured set no longer contains it. So banking the measured set verbatim
 * would REMOVE each file from protection on the very commit that converts it —
 * the gate would forget the capability at the exact instant it became possible
 * to lose it, and would then report a clean run forever.
 *
 * Union with what is already banked. The set only grows; a file leaves it by
 * being deleted, and that is reported rather than assumed.
 */
function unionClickThrough(app) {
  const prior = existingBaseline?.clickThrough?.[app] ?? [];
  return [...new Set([...prior, ...clickThroughByApp[app]])].sort();
}

if (updating) {
  const banked = {
    _doc:
      'Banked counts of hand-rolled <table>/<Table> RENDER SITES per app, and DataGrid adoption. ' +
      'Written by scripts/check-airtable-grid-adoption.mjs --update. Fails on any RISE (a new hand-rolled ' +
      'table is a page someone must convert later) and on any UNBANKED FALL (so a matcher that goes blind ' +
      'cannot read as progress). Operator ask 2026-08-28: every table should be in the Airtable style.',
    _measured: `${examinedFiles} .tsx files examined across ${APPS.length} apps`,
    _clickThroughDoc:
      'Files that HAD row-level click-through to a record. Recorded by PATH because a conversion ' +
      'destroys the <TableRow onClick> evidence. Any file here that renders a DataGrid must pass ' +
      'onRowClick, or the conversion turned a working navigation into a dead list. Operator ask ' +
      '2026-08-28: "make sure table that currently enable click through to a record still maintain ' +
      'this capability." The set is a UNION and only grows.',
    apps: measured,
    clickThrough: Object.fromEntries(APPS.map((a) => [a, unionClickThrough(a)])),
  };
  writeFileSync(BASELINE, `${JSON.stringify(banked, null, 2)}\n`);
  console.log(`banked: ${JSON.stringify(measured)}`);
  process.exit(0);
}

const baseline = existingBaseline;
if (!baseline) {
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

/*
 * The click-through check. This is the half of the gate that protects a
 * CAPABILITY rather than a count — and the count alone would applaud its loss,
 * because a converted table is progress by every other measure here.
 */
let protectedFiles = 0;
let stillHandRolled = 0;
for (const app of APPS) {
  for (const rel of baseline.clickThrough?.[app] ?? []) {
    protectedFiles += 1;
    let text;
    try {
      text = readFileSync(join(ROOT, rel), 'utf8');
    } catch {
      // Deleted or renamed. Either may be legitimate, but neither may be
      // guessed at: a rename that silently drops the file from the set is
      // indistinguishable from a conversion that dropped the navigation.
      problems.push(
        `${rel} is in the click-through set but cannot be read. If it moved, re-bank with --update in ` +
          'the same commit; if it was deleted, say so there too. Do not let it fall out silently.',
      );
      continue;
    }
    if (usesDataGrid(text)) {
      if (!hasRowClick(text)) {
        problems.push(
          `${rel} opened a record on row click, and its DataGrid conversion does not pass onRowClick. ` +
            'The list still renders, so every other check here reads this as progress — but the ' +
            'navigation is gone. Wire onRowClick.',
        );
      }
    } else {
      stillHandRolled += 1;
    }
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
console.log(
  `click-through: ${protectedFiles} file(s) protected, ${protectedFiles - stillHandRolled} converted and ` +
    `keeping onRowClick, ${stillHandRolled} not yet converted.`,
);

/* ═══════════════════════════════════════════════════════════════════════════
 * --classify — report WHAT the remaining count is made of. Verdict-neutral.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The ratchet counts every hand-rolled table, which is the right denominator
 * for a ratchet: it must be impossible to add one. It is the WRONG number to
 * plan with, because not every hand-rolled table should become a DataGrid.
 *
 * Measured 2026-08-29 across 143 files carrying a hand-rolled table:
 *
 *     117  records grid — a genuine conversion target
 *      15  static / layout table
 *       7  primitive or shared table component
 *       4  summary or chart-breakdown table
 *
 * The last three groups are 26 files that SHOULD NOT be converted:
 *
 *   - the primitives ARE the table (components/ui/table.tsx, skeleton-table);
 *     converting them is circular
 *   - a permission matrix or an incident detail view is a layout, not a list
 *   - a chart breakdown under a ChartCard uses `<th scope="row">` for row
 *     headers, which is an accessibility affordance a DataGrid row does not
 *     carry. crm7/src/pages/analytics/gto/PlacementsDashboard.tsx is the clear
 *     case: four columns, a Sparkline cell, and row headers, sitting beneath a
 *     bar chart. Converting it would add grid chrome to a legend and lose the
 *     row-header semantics.
 *
 * This does not change the verdict, the baseline, or what the ratchet blocks.
 * It exists so that "202 remaining" is not read as "202 pages of work", which
 * is how a proxy metric quietly becomes the goal it was standing in for.
 *
 * Heuristic, and deliberately labelled as one: it reads render-site signals,
 * not intent. Treat the split as a planning aid, and confirm the class by
 * opening the file before converting it.
 */
function classifyRemaining(files) {
  const RECORD = /onRowClick|navigate\(|<Link\b|href=|Pagination|sortBy|setSort|filter/i;
  const SUMMARY = /ChartCard|Sparkline|scope="row"|ResponsiveContainer|aggregate/i;
  const PRIMITIVE = /components\/ui\/table\.tsx$|skeleton-table|\/DataTable\.tsx$|MarkdownContent/;
  const out = { 'records grid (convertible)': 0, 'static / layout': 0, 'primitive / shared': 0, 'summary / chart': 0 };
  for (const { path: p, text } of files) {
    if (PRIMITIVE.test(p)) out['primitive / shared']++;
    else if (SUMMARY.test(text) && !RECORD.test(text)) out['summary / chart']++;
    else if (RECORD.test(text)) out['records grid (convertible)']++;
    else out['static / layout']++;
  }
  return out;
}

export { classifyRemaining };
