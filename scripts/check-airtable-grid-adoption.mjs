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
 *   node scripts/check-airtable-grid-adoption.mjs                    # verify (PR path)
 *   node scripts/check-airtable-grid-adoption.mjs --update-baseline  # bank (--update still accepted)
 *   node scripts/check-airtable-grid-adoption.mjs --reset-schedule --reason "<why>"  # re-arm the floor
 *   node scripts/check-airtable-grid-adoption.mjs --check-floor      # NIGHTLY ONLY — never a PR check
 *
 * Environment:
 *   AIRTABLE_GRID_SCAN_ROOT   the tree to scan (default: this repo) — see the comment on ROOT
 *   AIRTABLE_GRID_BASELINE    the baseline file to read AND write (default:
 *                             scripts/airtable-grid-adoption-baseline.json). Exists so a fixture run
 *                             (--self-test, a scratch scan) can bank into a temp file; without it
 *                             `--update-baseline` against a scan root wrote the COMMITTED baseline
 *                             (review 2026-09-03, bsuite#2970). Never set it in CI.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/*
 * SCHEDULED FLOOR — PI ruling 2026-09-03 (audit §7, C2).
 *
 * The per-app rise/fall ratchet below only ever refuses a RISE and demands a
 * re-bank on an unbanked FALL; nothing makes the estate-wide hand-rolled count
 * actually shrink over time. `_schedule.origin_count` decays by `per_week` from
 * `_schedule.origin_date`, evaluated ONLY by a nightly, non-required job (see
 * estate-alignment.yml) — never a PR check. A missing or non-numeric schedule
 * field under --check-floor is a FAILURE ("schedule unarmed"), not a silent pass.
 *
 * UNIT: origin_count and the floor count hand-rolled RENDER SITES (Σ handRolled),
 * not files (Σ files) — 192 sites across 138 files on 2026-09-03. per_week is
 * therefore "render sites per week". The first bank labelled it "files/week";
 * review bsuite#2970 caught the mismatch.
 */
export function scheduledFloor(schedule, today = new Date()) {
  if (scheduleUnarmed(schedule).length) return null;
  const { origin_count, origin_date, per_week } = schedule;
  const start = new Date(`${origin_date}T00:00:00Z`).getTime();
  const weeks = Math.max(0, Math.floor((today.getTime() - start) / (7 * 24 * 60 * 60 * 1000)));
  return Math.max(0, origin_count - per_week * weeks);
}

/*
 * EVERY schedule field, not only origin_date — review 2026-09-03 (bsuite#2970).
 * With origin_count or per_week missing the arithmetic above yields NaN, and
 * `live > NaN` is false, so --check-floor printed "floor today: NaN … floor
 * holds." and exited 0. Returns the NAMES of the fields that are missing or
 * non-numeric (origin_date: missing or unparseable); empty means armed.
 */
export function scheduleUnarmed(schedule) {
  const bad = [];
  if (!schedule || typeof schedule !== 'object') return ['origin_count', 'origin_date', 'per_week'];
  if (typeof schedule.origin_count !== 'number' || !Number.isFinite(schedule.origin_count)) bad.push('origin_count');
  if (typeof schedule.origin_date !== 'string' || !schedule.origin_date || Number.isNaN(new Date(`${schedule.origin_date}T00:00:00Z`).getTime())) bad.push('origin_date');
  if (typeof schedule.per_week !== 'number' || !Number.isFinite(schedule.per_week)) bad.push('per_week');
  return bad;
}

/** A scan that examined fewer files than it did when banked has gone blind, not clean. */
export function denominatorFell(scannedNow, bankedScanned) {
  return scannedNow < bankedScanned;
}

/* PI ruling 2026-09-03: 6 hand-rolled RENDER SITES per week, estate-wide sum, from origin 192. */
const GRID_PER_WEEK = 6;
/* Written into `_schedule.unit` so the baseline names what origin_count/per_week count. */
const SCHEDULE_UNIT = 'hand-rolled <table>/<Table> RENDER SITES (sum of apps.*.handRolled), not files; per_week is render sites per week';
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
 * numbers CI can actually reproduce. The BASELINE path is NOT derived from it:
 * the baseline belongs to the repo, not to the tree being measured. It IS
 * overridable separately via AIRTABLE_GRID_BASELINE, so a fixture run can bank
 * into a temp file instead of the committed one.
 */
const ROOT = process.env.AIRTABLE_GRID_SCAN_ROOT
  ? resolve(process.env.AIRTABLE_GRID_SCAN_ROOT)
  : resolve(HERE, '..');
const BASELINE = process.env.AIRTABLE_GRID_BASELINE
  ? resolve(process.env.AIRTABLE_GRID_BASELINE)
  : join(HERE, 'airtable-grid-adoption-baseline.json');

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

  /*
   * THE onRowClick CEILING — PI ruling 2026-09-03 (audit §7, C2): the requirement
   * now covers EVERY file importing @bsuite/data-grid, not only the banked
   * pre-conversion clickThrough set. A file rendering DataGrid with no onRowClick
   * MUST count toward the ceiling — this is the exact "planted onRowClick-less
   * DataGrid file" case, through the same usesDataGrid()/hasRowClick() the live
   * per-app scan calls on every file it walks.
   */
  const ceilingCases = [
    ['<DataGrid columns={c} data={d} />', true, 'a planted DataGrid file with NO onRowClick counts against the ceiling'],
    ['<DataGrid columns={c} data={d} onRowClick={open} />', false, 'a DataGrid file WITH onRowClick does not count against the ceiling'],
    ['<table><tr><td>x</td></tr></table>', false, 'a hand-rolled table with no DataGrid does not count — this ceiling is DataGrid-scoped'],
  ];
  for (const [source, expectedMissing, why] of ceilingCases) {
    const got = usesDataGrid(source) && !hasRowClick(source);
    if (got !== expectedMissing) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expectedMissing}, got ${got}`);
      failed += 1;
    }
  }

  /*
   * SCHEDULED-FLOOR self-tests, through the SAME `scheduledFloor()` the live
   * --check-floor path calls: 0 weeks equals origin, N weeks subtracts
   * N*per_week, the floor never goes negative, missing origin_date fails.
   */
  const floorCases = [
    ['floor at 0 weeks equals origin', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03', per_week: 6 }, new Date('2026-09-03T00:00:00Z')) === 192],
    ['floor after 1 week is origin - per_week', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03', per_week: 6 }, new Date('2026-09-10T00:00:00Z')) === 186],
    ['floor after 5 weeks is origin - 5*per_week', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03', per_week: 6 }, new Date('2026-10-08T00:00:00Z')) === 162],
    ['floor never goes negative — floors at 0', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03', per_week: 6 }, new Date('2035-01-01T00:00:00Z')) === 0],
    ['missing origin_date returns null (caller must treat as FAILURE)', scheduledFloor({ origin_count: 192, origin_date: null, per_week: 6 }) === null],
    // THE NaN HOLE (review bsuite#2970): 192 > NaN is false, so these used to "hold".
    ['missing origin_count returns null, never NaN', scheduledFloor({ origin_date: '2026-09-03', per_week: 6 }) === null],
    ['missing per_week returns null, never NaN', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03' }) === null],
    ['a STRING per_week is non-numeric and returns null', scheduledFloor({ origin_count: 192, origin_date: '2026-09-03', per_week: '6' }) === null],
    ['scheduleUnarmed names every missing field', JSON.stringify(scheduleUnarmed({ origin_date: '2026-09-03' })) === '["origin_count","per_week"]'],
    ['scheduleUnarmed is empty on a complete schedule', scheduleUnarmed({ origin_count: 192, origin_date: '2026-09-03', per_week: 6 }).length === 0],
    ['denominator fall is caught', denominatorFell(90, 95) === true],
    ['denominator rise is not a fall', denominatorFell(100, 95) === false],
    ['denominator equality is not a fall', denominatorFell(95, 95) === false],
  ];
  for (const [why, ok] of floorCases) {
    if (!ok) {
      console.error(`SELF-TEST FAIL: ${why}`);
      failed += 1;
    }
  }

  /*
   * IMPORT-SCOPE predicate (review bsuite#2970, rule 5): the ceiling covers
   * every file that IMPORTS @bsuite/data-grid, whether or not it renders a
   * literal <DataGrid tag. Negative controls: prose naming the package, and a
   * different package sharing the prefix, must NOT count.
   */
  const importCases = [
    ["import { DataGrid } from '@bsuite/data-grid';\n<DataGrid columns={c} />", true, 'the ordinary import + tag'],
    ["import { DataGrid as Grid } from '@bsuite/data-grid';\n<Grid columns={c} />", true, 'an ALIASED import with no literal <DataGrid tag — the case the tag-only predicate missed'],
    ['import type { ColumnDef } from "@bsuite/data-grid";', true, 'a type-only import still binds the file to the package'],
    ["import '@bsuite/data-grid/styles.css';", true, 'a side-effect subpath import'],
    ["export { DataGrid } from '@bsuite/data-grid';", true, 'a re-export is an import'],
    ['// the @bsuite/data-grid package is documented here', false, 'a COMMENT naming the package is not an import'],
    ["import { x } from '@bsuite/data-grid-legacy';", false, 'a different package sharing the prefix'],
    ['<DataGrid columns={c} />', true, 'a bare tag with no import line still counts (tag OR import)'],
    ['<table><tr><td/></tr></table>', false, 'a hand-rolled table neither imports nor renders'],
  ];
  for (const [source, expected, why] of importCases) {
    const got = usesDataGrid(source);
    if (got !== expected) {
      console.error(`SELF-TEST FAIL: ${why} — expected ${expected}, got ${got}`);
      failed += 1;
    }
  }

  /*
   * ENTRY-POINT self-tests — review 2026-09-03 (bsuite#2970), rule 6. Each case
   * spawns THIS script as a child process with AIRTABLE_GRID_SCAN_ROOT pointing
   * at a temp app tree and AIRTABLE_GRID_BASELINE at a temp baseline, and asserts
   * the EXIT CODE. The committed baseline is never read or written here; the
   * temp tree is removed afterwards.
   */
  const fixture = mkdtempSync(join(tmpdir(), 'c2-grid-'));
  let entryCount = 0;
  try {
    const write = (rel, text) => { mkdirSync(dirname(join(fixture, rel)), { recursive: true }); writeFileSync(join(fixture, rel), text); };
    // A tree with two hand-rolled render sites in crm7 and one converted DataGrid file WITH onRowClick.
    write('crm7/src/pages/a.tsx', '<Table><TableRow onClick={f}><TableCell/></TableRow></Table>\n');
    write('crm7/src/pages/b.tsx', '<table><tr><td/></tr></table>\n');
    write('crm7/src/pages/c.tsx', "import { DataGrid } from '@bsuite/data-grid';\n<DataGrid columns={c} onRowClick={open} />\n");
    for (const app of ['business-suite-unified', 'conduit', 'braden', 'throughput']) write(`${app}/src/x.tsx`, 'export const X = () => null;\n');
    const baselinePath = join(fixture, 'baseline.json');
    const run = (args, env = {}) => {
      const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...args], {
        encoding: 'utf8',
        env: { ...process.env, AIRTABLE_GRID_SCAN_ROOT: fixture, AIRTABLE_GRID_BASELINE: baselinePath, ...env },
      });
      return { code: r.status, out: `${r.stdout}${r.stderr}` };
    };
    const committedBefore = readFileSync(BASELINE, 'utf8');
    const entryCases = [];
    const expect = (why, r, code, re) => entryCases.push([why, r.code === code && re.test(r.out), r]);

    expect('ENTRY: --reset-schedule --reason banks a fixture baseline into the TEMP path → exit 0',
      run(['--reset-schedule', '--reason', 'self-test fixture']), 0, /SCHEDULE RESET/);
    expect('ENTRY: committed baseline byte-identical after the fixture bank (AIRTABLE_GRID_BASELINE honoured)',
      { code: readFileSync(BASELINE, 'utf8') === committedBefore ? 0 : 1, out: 'compared' }, 0, /compared/);
    expect('ENTRY: clean fixture, PR path → exit 0',
      run([]), 0, /grid adoption OK/);
    expect('ENTRY: clean fixture, --check-floor → exit 0 "floor holds"',
      run(['--check-floor']), 0, /floor holds/);

    // Plant an onRowClick-less DataGrid file (the grid case the review names).
    write('crm7/src/pages/Planted.tsx', "import { DataGrid } from '@bsuite/data-grid';\n<DataGrid columns={c} data={d} />\n");
    expect('ENTRY: planted onRowClick-less DataGrid file → exit 1 "missing onRowClick ROSE 0 -> 1"',
      run([]), 1, /missing onRowClick ROSE 0 -> 1/);
    // Aliased import, no literal tag — must count under the widened predicate.
    write('crm7/src/pages/Planted.tsx', "import { DataGrid as Grid } from '@bsuite/data-grid';\n<Grid columns={c} data={d} />\n");
    expect('ENTRY: planted ALIASED import with no <DataGrid tag and no onRowClick → exit 1 (import-scope)',
      run([]), 1, /missing onRowClick ROSE 0 -> 1/);
    rmSync(join(fixture, 'crm7/src/pages/Planted.tsx'));

    // A new hand-rolled table is a RISE.
    write('crm7/src/pages/d.tsx', '<table/>\n');
    expect('ENTRY: planted hand-rolled table → exit 1 "hand-rolled tables ROSE 2 -> 3"',
      run([]), 1, /hand-rolled tables ROSE 2 -> 3/);
    rmSync(join(fixture, 'crm7/src/pages/d.tsx'));

    // Denominator falls: delete a scanned file.
    rmSync(join(fixture, 'throughput/src/x.tsx'));
    expect('ENTRY: a scanned file deleted → exit 1 "files scanned FELL 1 -> 0"',
      run([]), 1, /files scanned FELL 1 -> 0/);
    write('throughput/src/x.tsx', 'export const X = () => null;\n');

    // Schedule edits, on the TEMP baseline only.
    const b = () => JSON.parse(readFileSync(baselinePath, 'utf8'));
    const putSchedule = (s) => { const j = b(); j._schedule = s; writeFileSync(baselinePath, `${JSON.stringify(j, null, 2)}\n`); };
    const armed = b()._schedule;
    putSchedule({ ...armed, origin_date: new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10), per_week: 1 });
    expect('ENTRY: origin 3 weeks back at 1/week (floor 0 < live 2), --check-floor → exit 1 FLOOR BREACHED',
      run(['--check-floor']), 1, /FLOOR BREACHED: 2 > 0/);
    putSchedule({ ...armed, origin_date: undefined });
    expect('ENTRY: origin_date missing, --check-floor → exit 1 SCHEDULE UNARMED: origin_date',
      run(['--check-floor']), 1, /SCHEDULE UNARMED: origin_date/);
    putSchedule({ ...armed, origin_count: undefined });
    expect('ENTRY: origin_count missing, --check-floor → exit 1 SCHEDULE UNARMED: origin_count (was NaN, exit 0)',
      run(['--check-floor']), 1, /SCHEDULE UNARMED: origin_count/);
    putSchedule({ ...armed, per_week: undefined });
    expect('ENTRY: per_week missing, --check-floor → exit 1 SCHEDULE UNARMED: per_week (was NaN, exit 0)',
      run(['--check-floor']), 1, /SCHEDULE UNARMED: per_week/);
    putSchedule({ ...armed, per_week: '1' });
    expect('ENTRY: per_week non-numeric, --check-floor → exit 1 SCHEDULE UNARMED: per_week',
      run(['--check-floor']), 1, /SCHEDULE UNARMED: per_week/);
    expect('ENTRY: --reset-schedule without --reason → exit 1',
      run(['--reset-schedule']), 1, /requires --reason/);
    expect('ENTRY: committed baseline STILL byte-identical after every fixture run',
      { code: readFileSync(BASELINE, 'utf8') === committedBefore ? 0 : 1, out: 'compared' }, 0, /compared/);

    for (const [why, ok, r] of entryCases) {
      if (!ok) {
        console.error(`SELF-TEST FAIL: ${why} — exit ${r.code}\n${String(r.out).replace(/^/gm, '    | ')}`);
        failed += 1;
      }
    }
    entryCount = entryCases.length;
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  if (failed > 0) {
    console.error(`\nSELF-TEST FAILED (${failed}). The counter is broken; its numbers must not be believed.`);
    process.exit(2);
  }
  const negatives =
    cases.filter((c) => c[1] === 0).length +
    gridCases.filter((c) => c[1] === 0).length +
    clickCases.filter((c) => c[1] === false).length +
    convCases.filter((c) => c[1] === false).length +
    ceilingCases.filter((c) => c[1] === false).length +
    importCases.filter((c) => c[1] === false).length;
  const totalControls = cases.length + gridCases.length + clickCases.length + convCases.length + ceilingCases.length + floorCases.length + importCases.length + entryCount;
  console.log(
    `self-test OK — ${totalControls} controls, including ${negatives} that must NOT count and ${entryCount} through the CLI entry point against a temp scan root + temp baseline (removed; committed baseline untouched).`,
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
/*
 * IMPORT OR TAG — review 2026-09-03 (bsuite#2970), rule 5.
 *
 * The PI ruling covers every file that IMPORTS `@bsuite/data-grid`. Detecting
 * only a literal `<DataGrid` JSX tag left a file outside the ceiling if it
 * consumed the package any other way — aliased (`import { DataGrid as Grid }`),
 * passed as a component reference, wrapped. Measured 2026-09-03 the two sets
 * coincide in crm7 (22 import, 22 render the tag, 0 either-only), so the banked
 * 17 of 22 does not move; the predicate is widened so it CANNOT diverge later.
 *
 * `importsDataGrid` matches the specifier `@bsuite/data-grid` (and any subpath
 * `@bsuite/data-grid/…`) inside quotes after `from` or as a bare side-effect
 * import — a comment that merely names the package does not import it.
 */
function importsDataGrid(text) {
  return /\b(?:from|import)\s*['"]@bsuite\/data-grid(?:\/[^'"]*)?['"]/.test(text);
}
function usesDataGrid(text) {
  return importsDataGrid(text) || countDataGrid(text) > 0;
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
const dataGridByApp = {};
let examinedFiles = 0;
for (const app of APPS) {
  const src = join(ROOT, app, 'src');
  const files = walk(src);
  examinedFiles += files.length;
  let handRolled = 0;
  let dataGrid = 0;
  const sites = [];
  const clickThrough = [];
  /*
   * onRowClick CEILING — PI ruling 2026-09-03 (audit §7, C2): every file
   * importing @bsuite/data-grid, not only the pre-conversion clickThrough set
   * below. `missingOnRowClick` is banked as a ceiling that may only shrink
   * (owned by C8, driving it to 0); a file that later loses onRowClick is a
   * RISE and fails the PR path exactly like the narrower clickThrough check.
   */
  const dataGridFiles = [];
  const missingOnRowClick = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const t = countTables(text);
    const d = countDataGrid(text);
    handRolled += t;
    dataGrid += d;
    if (t > 0) sites.push(relative(ROOT, file));
    if (hasRowLevelClickThrough(text)) clickThrough.push(relative(ROOT, file));
    if (usesDataGrid(text)) {
      const rel = relative(ROOT, file);
      dataGridFiles.push(rel);
      if (!hasRowClick(text)) missingOnRowClick.push(rel);
    }
  }
  measured[app] = { handRolled, dataGrid, files: sites.length, filesScanned: files.length };
  clickThroughByApp[app] = clickThrough.sort();
  dataGridByApp[app] = { total: dataGridFiles.length, missing: missingOnRowClick.length, missingFiles: missingOnRowClick.sort() };
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

const cliArgs = process.argv.slice(2);
const updating = cliArgs.includes('--update') || cliArgs.includes('--update-baseline');
const resettingSchedule = cliArgs.includes('--reset-schedule');
const checkingFloor = cliArgs.includes('--check-floor');
const reasonIdx = cliArgs.indexOf('--reason');
const REASON = reasonIdx !== -1 ? cliArgs[reasonIdx + 1] : null;

// Read first: --update-baseline needs the prior baseline to union the protected
// set, and a missing one on a verify run is a hard failure below rather than a
// silent 0.
let existingBaseline = null;
try {
  existingBaseline = JSON.parse(readFileSync(BASELINE, 'utf8'));
} catch {
  existingBaseline = null;
}

const totalNow = APPS.reduce((sum, a) => sum + measured[a].handRolled, 0);

if (resettingSchedule) {
  if (!REASON) {
    console.error('FAIL: --reset-schedule requires --reason "<text>" — _schedule.origin_* is a schedule commitment and must not move silently.');
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  const priorSchedule = existingBaseline?._schedule;
  const banked = {
    ...(existingBaseline || {}),
    apps: measured,
    clickThrough: Object.fromEntries(APPS.map((a) => [a, [...new Set([...(existingBaseline?.clickThrough?.[a] ?? []), ...clickThroughByApp[a]])].sort()])),
    dataGridOnRowClick: Object.fromEntries(APPS.map((a) => [a, { ceiling: dataGridByApp[a].missing, total: dataGridByApp[a].total }])),
    _schedule: {
      unit: SCHEDULE_UNIT,
      origin_count: totalNow,
      origin_date: today,
      current_count: totalNow,
      current_date: today,
      scanned: examinedFiles,
      per_week: priorSchedule?.per_week ?? GRID_PER_WEEK,
    },
  };
  writeFileSync(BASELINE, `${JSON.stringify(banked, null, 2)}\n`);
  console.log(`SCHEDULE RESET. reason: ${REASON}`);
  console.log(`  new origin: ${banked._schedule.origin_count} hand-rolled render sites across ${banked._schedule.scanned} files scanned, from ${banked._schedule.origin_date}, ${banked._schedule.per_week} render sites/week`);
  process.exit(0);
}

if (checkingFloor) {
  // NIGHTLY-ONLY. Never invoked on the PR path — see estate-alignment.yml's
  // schedule-gated job. The floor is a schedule commitment, not a per-PR gate.
  const sched = existingBaseline?._schedule;
  if (!sched) {
    console.error('SCHEDULE UNARMED: no _schedule block in the baseline — the floor has nothing to decay from.');
    process.exit(1);
  }
  // Every field, by name — a floor computed from a missing origin_count or
  // per_week is NaN, and NaN "holds" against any live count (review bsuite#2970).
  const unarmed = scheduleUnarmed(sched);
  if (unarmed.length) {
    for (const f of unarmed) console.error(`SCHEDULE UNARMED: ${f} — missing or non-numeric in _schedule; the floor cannot be computed.`);
    process.exit(1);
  }
  const floor = scheduledFloor(sched, new Date());
  console.log(`hand-rolled render sites: ${totalNow} (examined ${examinedFiles} files); floor today: ${floor} (origin ${sched.origin_count} render sites on ${sched.origin_date}, ${sched.per_week} render sites/week)`);
  if (totalNow > floor) {
    console.error(`FLOOR BREACHED: ${totalNow} > ${floor}.`);
    process.exit(1);
  }
  console.log('floor holds.');
  process.exit(0);
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
  const priorSchedule = existingBaseline?._schedule;
  const banked = {
    _doc:
      'Banked counts of hand-rolled <table>/<Table> RENDER SITES per app, and DataGrid adoption. ' +
      'Written by scripts/check-airtable-grid-adoption.mjs --update-baseline. Fails on any RISE (a new ' +
      'hand-rolled table is a page someone must convert later) and on any UNBANKED FALL (so a matcher ' +
      'that goes blind cannot read as progress). Operator ask 2026-08-28: every table should be in the ' +
      'Airtable style.',
    _measured: `${examinedFiles} .tsx files examined across ${APPS.length} apps`,
    _clickThroughDoc:
      'Files that HAD row-level click-through to a record. Recorded by PATH because a conversion ' +
      'destroys the <TableRow onClick> evidence. Any file here that renders a DataGrid must pass ' +
      'onRowClick, or the conversion turned a working navigation into a dead list. Operator ask ' +
      '2026-08-28: "make sure table that currently enable click through to a record still maintain ' +
      'this capability." The set is a UNION and only grows.',
    apps: measured,
    clickThrough: Object.fromEntries(APPS.map((a) => [a, unionClickThrough(a)])),
    /* PI ruling 2026-09-03 (audit §7, C2): the onRowClick requirement now covers
     * EVERY file importing @bsuite/data-grid. `ceiling` is banked here as the
     * count that may only shrink (owned by C8, driving it to 0) — a separate,
     * wider dimension from `clickThrough` above, which stays scoped to files
     * that had row-level click-through BEFORE conversion. */
    dataGridOnRowClick: Object.fromEntries(APPS.map((a) => [a, { ceiling: dataGridByApp[a].missing, total: dataGridByApp[a].total }])),
    _schedule: {
      unit: SCHEDULE_UNIT,
      origin_count: priorSchedule?.origin_count ?? totalNow,
      origin_date: priorSchedule?.origin_date ?? null,
      current_count: totalNow,
      current_date: new Date().toISOString().slice(0, 10),
      scanned: examinedFiles,
      per_week: priorSchedule?.per_week ?? GRID_PER_WEEK,
    },
  };
  writeFileSync(BASELINE, `${JSON.stringify(banked, null, 2)}\n`);
  console.log(`banked: ${JSON.stringify(measured)}`);
  process.exit(0);
}

const baseline = existingBaseline;
if (!baseline) {
  console.error(`FAIL: no baseline at ${relative(ROOT, BASELINE)}. Run with --update-baseline to bank the current counts.`);
  process.exit(2);
}

const problems = [];
for (const app of APPS) {
  const now = measured[app];
  const was = baseline.apps?.[app];
  if (!was) {
    problems.push(`${app}: not in the baseline. Run --update-baseline.`);
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
        'If you converted them, run --update-baseline. If you did not, this gate has gone blind — find out which.',
    );
  }

  /*
   * THE DENOMINATOR MUST NOT SHRINK EITHER — PI ruling 2026-09-03 (audit §7, C2).
   * `handRolled` alone cannot tell "the app got cleaner" from "the walk found
   * fewer files" — a scan that examines less of the tree than it did when banked
   * has gone blind, not clean, and is refused rather than believed.
   */
  if (was.filesScanned !== undefined && denominatorFell(now.filesScanned, was.filesScanned)) {
    problems.push(
      `${app}: files scanned FELL ${was.filesScanned} -> ${now.filesScanned} (below the bank). The scan may ` +
        'have gone blind — investigate before trusting the hand-rolled count. If the app tree genuinely ' +
        'shrank, run --update-baseline.',
    );
  }

  /*
   * THE onRowClick CEILING — every DataGrid-importing file, not only the
   * pre-conversion clickThrough set (checked separately below). A rise is a
   * regression (a converted file lost onRowClick, or a NEW DataGrid file was
   * added without it); an unbanked fall must be looked at like any other
   * ratchet improvement, not assumed.
   */
  const nowDG = dataGridByApp[app];
  const wasDG = baseline.dataGridOnRowClick?.[app];
  if (!wasDG) {
    problems.push(`${app}: dataGridOnRowClick not in the baseline. Run --update-baseline.`);
  } else if (nowDG.missing > wasDG.ceiling) {
    problems.push(
      `${app}: DataGrid files missing onRowClick ROSE ${wasDG.ceiling} -> ${nowDG.missing} ` +
        `(${nowDG.missingFiles.slice(0, 5).join(', ')}${nowDG.missingFiles.length > 5 ? ', …' : ''}). ` +
        'Every @bsuite/data-grid render site needs onRowClick wired.',
    );
  } else if (nowDG.missing < wasDG.ceiling) {
    problems.push(
      `${app}: DataGrid files missing onRowClick FELL ${wasDG.ceiling} -> ${nowDG.missing} without being ` +
        'banked. If you wired onRowClick, run --update-baseline.',
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
        `${rel} is in the click-through set but cannot be read. If it moved, re-bank with --update-baseline in ` +
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
{
  const dgTotal = APPS.reduce((sum, a) => sum + dataGridByApp[a].total, 0);
  const dgMissing = APPS.reduce((sum, a) => sum + dataGridByApp[a].missing, 0);
  console.log(
    `onRowClick ceiling (every @bsuite/data-grid file, not only pre-conversion click-through): ` +
      `${dgMissing} of ${dgTotal} DataGrid file(s) missing onRowClick (ceiling holds; owned by C8, may only shrink).`,
  );
}

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
