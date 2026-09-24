#!/usr/bin/env node
/**
 * Renders the machine-readable surface map into the two artefacts a human reads:
 * a committed JSON beside the route inventory, and a CSV of all 553 rows.
 * The markdown ledger is written by hand — a generated narrative is a narrative
 * nobody checked.
 */
import fs from 'node:fs';
import path from 'node:path';
// THE DEFAULT WAS A DEAD SESSION SCRATCHPAD.
//
// It read `/tmp/claude-1000/.../<a session uuid>/scratchpad/surface/route-surface-map.json`.
// That directory belonged to a session that has since ended, so running this
// script produced an ENOENT on a path with no relationship to the repository —
// which reads as a broken script rather than as a missing input.
//
// The committed artefact IS the same object: this script's own last line writes
// `docs/nav/route-surface-map.json` from `m`, so reading it back is a faithful
// round trip (556 rows, same keys). Defaulting to it makes the script
// re-runnable by anyone, from a clean checkout, with no session state.
//
// `SP` still overrides, for the case this was written for: rendering a FRESH
// capture out of a scratchpad before it is committed.
const SP = process.env.SP || null;
const SOURCE = SP
  ? path.join(SP, 'surface/route-surface-map.json')
  : 'docs/nav/route-surface-map.json';
if (!fs.existsSync(SOURCE)) {
  console.error(`export-surface-map: no surface map at ${SOURCE}`);
  console.error(SP
    ? '  SP was set — check that the capture wrote surface/route-surface-map.json under it.'
    : '  Run from the repo root, or set SP=<scratchpad> to render a fresh capture.');
  process.exit(2);
}
const m = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

const cols = ['route','app','auth','component','component_file','hooks','tables','rls',
              'tables_via_shared','rpcs','edge_fns','edge_fn_deployed','tenant_scoped',
              'files_walked','unresolved_from','verdict','note'];
const cell = v => {
  if (v == null) return '';
  if (Array.isArray(v)) return v.join(' ');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}=${x}`).join(' ');
  return String(v);
};
const esc = s => /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
const csv = [cols.join(',')].concat(
  m.rows.map(r => cols.map(c => esc(cell(r[c]))).join(','))).join('\n');
fs.mkdirSync('docs/nav', { recursive: true });
fs.writeFileSync('docs/nav/route-surface-map.csv', csv + '\n');
fs.writeFileSync('docs/nav/route-surface-map.json', JSON.stringify(m, null, 2) + '\n');
// STATE WHAT WAS EXAMINED, NOT WHAT WAS WRITTEN.
//
// This printed "rows written: N", and check-guard-self-reporting.mjs failed it —
// correctly. A write count says nothing about whether the input was read: a script
// that read an empty object and wrote an empty CSV can still report a number. The
// count that matters is the one taken from the SOURCE, named alongside it, so a
// zero denominator is visible instead of being reported as a clean run.
if (m.rows.length === 0) {
  console.error(`export-surface-map: ${SOURCE} contains 0 rows — refusing to write an empty surface map.`);
  process.exit(1);
}
console.log(
  `export-surface-map: ${m.rows.length} row(s) read from ${SOURCE} across ` +
  `${cols.length} column(s); wrote docs/nav/route-surface-map.csv and .json.`,
);
