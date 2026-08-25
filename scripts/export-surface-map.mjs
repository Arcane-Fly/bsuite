#!/usr/bin/env node
/**
 * Renders the machine-readable surface map into the two artefacts a human reads:
 * a committed JSON beside the route inventory, and a CSV of all 553 rows.
 * The markdown ledger is written by hand — a generated narrative is a narrative
 * nobody checked.
 */
import fs from 'node:fs';
import path from 'node:path';
const SP = process.env.SP || '/tmp/claude-1000/-home-braden-Desktop-Dev-bsuite/08108081-3a6c-4f82-81b7-848dba9bb8bd/scratchpad';
const m = JSON.parse(fs.readFileSync(path.join(SP, 'surface/route-surface-map.json'), 'utf8'));

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
fs.writeFileSync('docs/nav/route-surface-map.json', JSON.stringify(m) + '\n');
console.log('rows written:', m.rows.length);
