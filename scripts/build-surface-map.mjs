#!/usr/bin/env node
/**
 * THE 553-ROUTE SURFACE MAP — one row per route, front end joined to back end.
 *
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * `docs/nav/route-inventory.json` (schema 3) already carries `data_tables` and
 * `owned_entities` fields for every one of its 553 routes. Measured 2026-08-25:
 * BOTH ARE EMPTY ON ALL 553. The schema promised the join and nothing ever
 * filled it, so the inventory answers "what routes exist" and cannot answer
 * "what does this route read, and who is allowed to read it".
 *
 * That gap is the whole point of the run this script was written for: the last
 * sweep covered 47 routes of 553 — 8%. Enumeration is not coverage.
 *
 * WHAT IT DOES
 * Resolves each route's component file, walks its import graph inside the app
 * (bounded), and collects every data access it can reach:
 *   supabase.from('t')   .rpc('f')   functions.invoke('slug')
 *   createEntityStore({ table })     hooks/stores by name
 * Then joins that against live production metadata dumped from Postgres:
 * RLS posture per table, whether a called edge function is deployed, and
 * whether a deployed edge function has any caller at all.
 *
 * WHAT IT STRUCTURALLY CANNOT SEE — stated here because a gate that does not
 * name its blind spots reads as complete:
 *   - a table name built at runtime (`from(tableVar)`) — counted as UNRESOLVED,
 *     never as "no data path". Those two are different findings and conflating
 *     them is how a static scan invents coverage.
 *   - data reached through a generic factory whose argument comes from a caller
 *     two files away (this estate has 364 such call sites) — the factory site is
 *     recorded, the concrete table is not.
 *   - anything behind a dynamic import whose specifier is not a literal.
 *   - RLS actually *enforced* at runtime. This reads pg_policies. A policy that
 *     exists is not a policy that is correct; that is the red team's job.
 *
 * A row is only ever `UNRESOLVED`, never silently blank — "checked nothing" and
 * "found nothing" must not share an output.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
/*
 * WHERE THE DB SNAPSHOT LIVES.
 *
 * This defaulted to a hard-coded path inside ONE AGENT SESSION'S scratchpad —
 * `/tmp/claude-1000/.../08108081-.../scratchpad` — a directory belonging to a
 * session that ended long ago. The script therefore could not run AT ALL for
 * anyone, including in CI, and the failure was ENOENT on a path no reader
 * would recognise as a scratchpad.
 *
 * That matters more than a broken script: `route-surface-map` tells you to fix
 * its drift by running "node scripts/build-surface-map.mjs", so the REMEDY the
 * gate prescribes was itself broken. A gate whose prescribed fix cannot run is
 * a gate that can only ever be silenced, not satisfied. (The sibling
 * export-surface-map.mjs carried the same defect and was corrected earlier;
 * this one was missed because only the export path was searched.)
 *
 * Now: an explicit SP env var still wins, then a repo-relative snapshot
 * directory, and if neither exists the script says exactly which files it
 * needs rather than dying inside a readFileSync.
 */
const SP = process.env.SP || path.join(ROOT, 'docs', 'nav', 'db-snapshot');

const APP_DIR = {
  crm7: 'crm7', bsu: 'business-suite-unified', conduit: 'conduit',
  braden: 'braden', throughput: 'throughput', r80: 'R80.4',
};

const EXTS = ['.tsx', '.ts', '.jsx', '.js'];
const readCache = new Map();
function read(f) {
  if (readCache.has(f)) return readCache.get(f);
  let s = null;
  try { s = fs.readFileSync(f, 'utf8'); } catch { s = null; }
  readCache.set(f, s);
  return s;
}
const existsCache = new Map();
function isFile(f) {
  if (existsCache.has(f)) return existsCache.get(f);
  let r = false;
  try { r = fs.statSync(f).isFile(); } catch { r = false; }
  existsCache.set(f, r);
  return r;
}

/** Resolve a module specifier to a file on disk, or null. */
function resolve(spec, fromFile, appDir) {
  let base;
  if (spec.startsWith('@/')) base = path.join(ROOT, appDir, 'src', spec.slice(2));
  else if (spec.startsWith('~/')) base = path.join(ROOT, appDir, 'src', spec.slice(2));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec);
  else if (spec.startsWith('@bsuite/')) {
    const pkg = spec.split('/')[1];
    const rest = spec.split('/').slice(2).join('/');
    base = path.join(ROOT, 'packages', pkg, 'src', rest || 'index');
  } else return null; // node_modules — out of scope by design
  for (const e of EXTS) { if (isFile(base + e)) return base + e; }
  if (isFile(base)) return base;
  for (const e of EXTS) { if (isFile(path.join(base, 'index' + e))) return path.join(base, 'index' + e); }
  return null;
}

/** All import specifiers in a file, static and dynamic-with-a-literal. */
function imports(src) {
  const out = new Set();
  const re = /(?:from\s*|import\s*\(\s*)["'`]([^"'`]+)["'`]/g;
  let m; while ((m = re.exec(src))) out.add(m[1]);
  const re2 = /require\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = re2.exec(src))) out.add(m[1]);
  return [...out];
}

/** Data access facts in one file. */
function facts(src) {
  const tables = new Set(), rpcs = new Set(), fns = new Set();
  let unresolvedFrom = 0;
  let m;
  const reFrom = /\.from\(\s*(["'`])([A-Za-z0-9_]+)\1\s*\)/g;
  while ((m = reFrom.exec(src))) tables.add(m[2]);
  // `.from(x)` with a non-literal — count it, never drop it silently.
  const reFromDyn = /\.from\(\s*(?!["'`])[A-Za-z_$][\w$.[\]]*\s*\)/g;
  while ((m = reFromDyn.exec(src))) unresolvedFrom++;
  const reRpc = /\.rpc\(\s*(["'`])([A-Za-z0-9_]+)\1/g;
  while ((m = reRpc.exec(src))) rpcs.add(m[2]);
  // edge fn: literal invoke, template-literal invoke, and raw fetch of /functions/v1/<slug>
  const reInv = /functions\s*\.\s*invoke\(\s*(["'`])([A-Za-z0-9_-]+)\1/g;
  while ((m = reInv.exec(src))) fns.add(m[2]);
  const reFetch = /functions\/v1\/([A-Za-z0-9_-]+)/g;
  while ((m = reFetch.exec(src))) fns.add(m[1]);
  // createEntityStore({ table: 'x' }) / entity factories
  const reEnt = /table\s*:\s*(["'`])([A-Za-z0-9_]+)\1/g;
  while ((m = reEnt.exec(src))) tables.add(m[2]);
  return { tables, rpcs, fns, unresolvedFrom };
}

/** Hooks/stores this file *defines* or *calls*, for the "data hook/store" column. */
function hookNames(src) {
  const out = new Set();
  let m;
  const re = /\b(use[A-Z][A-Za-z0-9_]*)\s*\(/g;
  while ((m = re.exec(src))) {
    const n = m[1];
    if (['useState','useEffect','useMemo','useCallback','useRef','useContext','useReducer',
         'useLayoutEffect','useId','useNavigate','useParams','useLocation','useSearchParams',
         'useForm','useTranslation','useTheme','useToast','useIsMobile','useMediaQuery',
         'useTransition','useDeferredValue','useSyncExternalStore','useImperativeHandle',
         'useFormContext','useFieldArray','useWatch','useRouter','usePathname'].includes(n)) continue;
    out.add(n);
  }
  return out;
}

// ---------------------------------------------------------------- route -> component file
function componentFile(route) {
  const appDir = APP_DIR[route.app];
  const rf = path.join(ROOT, route.route_file);
  // Next.js App Router (conduit): the route file IS the component.
  if (route.app === 'conduit') return isFile(rf) ? rf : null;
  const src = read(rf);
  if (!src) return null;
  const comp = route.component;
  if (!comp) return null;
  // named import / lazy import of that component
  // A `const <Comp> = ...` declaration's body can span lines and can wrap the
  // import: `lazy(() =>\n import('x'))` and `lazy(() => retryImport(() => import('x')))`
  // are both live idioms in crm7/src/App.tsx. A single-line regex sees NEITHER,
  // and the failure is silent: the component falls back to the route file, which
  // then walks the whole app and attributes every table in it to every route.
  // Measured 2026-08-25: that is exactly what happened — 360 of 553 rows were one
  // measurement of crm7 repeated, producing 369 phantom cross-tenant findings.
  const decl = new RegExp(`(?:^|\\n)\\s*(?:const|let|var)\\s+${comp}\\s*=`);
  const dm = src.match(decl);
  if (dm) {
    const tail = src.slice(dm.index, dm.index + 600);
    const im = tail.match(/import\(\s*["'`]([^"'`]+)["'`]/);
    if (im) { const r = resolve(im[1], rf, appDir); if (r) return r; }
  }
  const pats = [
    new RegExp(`import\\s+${comp}\\s+from\\s*["'\`]([^"'\`]+)["'\`]`),
    new RegExp(`import\\s*\\{[^}]*\\b${comp}\\b[^}]*\\}\\s*from\\s*["'\`]([^"'\`]+)["'\`]`),
  ];
  for (const p of pats) {
    const m = src.match(p);
    if (m) { const r = resolve(m[1], rf, appDir); if (r) return r; }
  }
  // component defined inline in the route file
  if (new RegExp(`(?:function|const)\\s+${comp}\\b`).test(src)) return rf;
  return null;
}

// ---------------------------------------------------------------- graph walk
const MAX_DEPTH = 4, MAX_FILES = 260;
function walk(entry, appDir) {
  const seen = new Set();
  const q = [[entry, 0]];
  // Depth matters and conflating it is a defect. A table reached at depth 4
  // through a shared layout, nav or notification component is NOT this route's
  // data path — attributing it as one makes every route in an app look identical.
  // `own` = depth<=2 (the page and what it directly imports); `reachable` = all.
  const acc = { tables: new Map(), rpcs: new Map(), fns: new Map(), hooks: new Set(),
                files: 0, unresolvedFrom: 0, truncated: false };
  const note = (map, k, d) => { if (!map.has(k) || map.get(k) > d) map.set(k, d); };
  while (q.length) {
    const [f, d] = q.shift();
    if (seen.has(f)) continue;
    seen.add(f);
    if (acc.files >= MAX_FILES) { acc.truncated = true; break; }
    const src = read(f);
    if (src == null) continue;
    acc.files++;
    const fx = facts(src);
    fx.tables.forEach(t => note(acc.tables, t, d));
    fx.rpcs.forEach(t => note(acc.rpcs, t, d));
    fx.fns.forEach(t => note(acc.fns, t, d));
    acc.unresolvedFrom += fx.unresolvedFrom;
    if (d <= 1) hookNames(src).forEach(h => acc.hooks.add(h));
    if (d >= MAX_DEPTH) continue;
    for (const spec of imports(src)) {
      const r = resolve(spec, f, appDir);
      if (r && !seen.has(r) && !r.includes('node_modules')) q.push([r, d + 1]);
    }
  }
  return acc;
}

// ---------------------------------------------------------------- db metadata
const J = f => {
  // Two shapes accepted: <SP>/db/<file> (the original scratchpad layout) and
  // <SP>/<file> (a plain snapshot directory), so an existing snapshot keeps
  // working wherever it sits.
  const candidates = [path.join(SP, 'db', f), path.join(SP, f)];
  const hit = candidates.find(c => fs.existsSync(c));
  if (!hit) {
    console.error(
      `build-surface-map: cannot find "${f}".\n` +
      `  Looked in: ${candidates.join('\n             ')}\n` +
      `  This script needs a DB snapshot (tables.json, policies.json, functions.json).\n` +
      `  Point it somewhere with SP=/path/to/snapshot, or place the files in\n` +
      `  docs/nav/db-snapshot/. Refusing rather than reading a stale map.`
    );
    process.exit(2);
  }
  return JSON.parse(fs.readFileSync(hit, 'utf8'));
};
const dbTables = new Map(J('tables.json').map(t => [t.table_name, t]));
const dbPolicies = J('policies.json');
const dbFns = new Map(J('functions.json').map(f => [f.proname, f]));
const polByTable = new Map();
for (const p of dbPolicies) {
  if (!polByTable.has(p.tablename)) polByTable.set(p.tablename, []);
  polByTable.get(p.tablename).push(p);
}
const deployed = new Set(JSON.parse(fs.readFileSync(path.join(SP, 'db', 'edge-functions.json'), 'utf8')));

function normQual(q) {
  return String(q || '')
    .replace(/\(\s*SELECT\s+([a-z_.]+\(\))\s+AS\s+\w+\s*\)/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
const ALWAYS_TRUE_RE = /^\(*\s*(true|auth\.uid\(\) IS NOT NULL|auth\.role\(\) = 'authenticated'::text)\s*\)*$/i;
function alwaysTrue(q) { return ALWAYS_TRUE_RE.test(normQual(q)); }

const TENANT_RE = /tenant_id|org_id|organisation_id|organization_id|current_tenant|acting_scope|user_tenants/i;
function posture(tableName) {
  const t = dbTables.get(tableName);
  if (!t) return 'NOT_A_TABLE';
  if (!t.rls_enabled) return (t.anon_select || t.auth_select) ? 'RLS_OFF_GRANTED' : 'RLS_OFF_NO_GRANT';
  const allPols = polByTable.get(tableName) || [];
  if (allPols.length === 0) return 'RLS_ON_ZERO_POLICY';
  // ONLY policies granted to a role a real signed-in user can hold decide the
  // posture. `TO service_role USING (true)` is the correct, expected shape for a
  // trusted server key and says nothing about what a tenant user can read.
  // Ignoring `roles` classified 15 tables as cross-tenant that were never open —
  // 369 phantom findings on 2026-08-25. The roles column is load-bearing.
  const USER_ROLES = ['authenticated', 'anon', 'public'];
  const pols = allPols.filter(p => USER_ROLES.some(r => (p.roles || '').includes(r)));
  if (pols.length === 0) return 'RLS_ON_SERVICE_ROLE_ONLY';
  const sel = pols.filter(p => p.cmd === 'SELECT' || p.cmd === 'ALL');
  if (sel.length === 0) return 'RLS_ON_NO_SELECT_POLICY';
  const scoped = sel.filter(p => TENANT_RE.test(p.qual || ''));
  const owner = sel.filter(p => /auth\.uid\(\)/.test(p.qual || '') && !TENANT_RE.test(p.qual || ''));
  // Postgres rewrites `auth.uid()` in a policy as `( SELECT auth.uid() AS uid)`,
  // so the always-true shape reaches pg_policies as
  //   `(( SELECT auth.uid() AS uid) IS NOT NULL)`
  // and a regex written against the AUTHORED form matches none of them. That
  // missed a live one on 2026-08-25: `award_rates` grants ALL to any signed-in
  // user on a table that carries tenant_id. Normalise before matching.
  const openish = sel.filter(p => alwaysTrue(p.qual));
  if (openish.length && t.has_tenant_id) return 'RLS_ON_PERMISSIVE_TENANT_TABLE';
  if (openish.length) return 'RLS_ON_PERMISSIVE';
  if (scoped.length === sel.length) return 'RLS_ON_TENANT_SCOPED';
  if (scoped.length) return 'RLS_ON_MIXED';
  if (owner.length) return 'RLS_ON_OWNER_SCOPED';
  return 'RLS_ON_ROLE_OR_OTHER';
}

// ---------------------------------------------------------------- build
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/nav/route-inventory.json'), 'utf8'));
const rows = [];
const fnCallers = new Map();      // edge fn slug -> [route paths]

for (const r of inv.routes) {
  const appDir = APP_DIR[r.app];
  const cf = componentFile(r);
  const row = {
    route: r.path, app: r.app, auth: r.auth.type, status: r.status,
    component: r.component,
    component_file: cf ? path.relative(ROOT, cf) : null,
    hooks: [], tables: [], rpcs: [], edge_fns: [],
    rls: {}, tenant_scoped: null,
    edge_fn_deployed: {}, unresolved_from: 0, files_walked: 0,
    verdict: null, note: null,
  };
  if (r.status === 'redirect') {
    row.verdict = 'REDIRECT'; row.note = 'route is a redirect, no data path of its own';
    rows.push(row); continue;
  }
  if (!cf) {
    row.verdict = 'UNRESOLVED';
    row.note = 'component file could not be resolved from ' + r.route_file + ' — NOT the same as "no data path"';
    rows.push(row); continue;
  }
  const acc = walk(cf, appDir);
  row.files_walked = acc.files;
  row.unresolved_from = acc.unresolvedFrom;
  const OWN = 2;
  row.hooks = [...acc.hooks].sort().slice(0, 24);
  const allTables = [...acc.tables.keys()];
  row.tables = allTables.filter(t => dbTables.has(t) && acc.tables.get(t) <= OWN).sort();
  row.tables_via_shared = allTables.filter(t => dbTables.has(t) && acc.tables.get(t) > OWN).sort();
  row.unknown_tables = allTables.filter(t => !dbTables.has(t)).sort();
  row.rpcs = [...acc.rpcs.keys()].filter(r => acc.rpcs.get(r) <= OWN).sort();
  row.rpcs_via_shared = [...acc.rpcs.keys()].filter(r => acc.rpcs.get(r) > OWN).sort();
  row.edge_fns = [...acc.fns.keys()].filter(f => acc.fns.get(f) <= OWN).sort();
  row.edge_fns_via_shared = [...acc.fns.keys()].filter(f => acc.fns.get(f) > OWN).sort();
  for (const t of row.tables) row.rls[t] = posture(t);
  for (const t of row.tables_via_shared) row.rls_shared = Object.assign(row.rls_shared || {}, { [t]: posture(t) });
  for (const f of [...row.edge_fns, ...row.edge_fns_via_shared]) {
    row.edge_fn_deployed[f] = deployed.has(f);
    if (!fnCallers.has(f)) fnCallers.set(f, []);
    fnCallers.get(f).push(`${r.app}${r.path}`);
  }
  // OWNER-SCOPING IS TIGHTER THAN TENANT-SCOPING, NOT WEAKER.
  // `RLS_ON_OWNER_SCOPED` on a table that happens to carry tenant_id means the
  // caller sees only their OWN rows — a strict subset of their tenant's. Counting
  // that as "partial tenancy" put 11 rows in REVIEW that were never defects
  // (app_notifications, projects), which is how a verdict column earns the habit
  // of being ignored.
  //
  // The measurement that settled it, and the mistake worth recording: my first
  // pass listed EVERY non-tenant-scoped posture on the REVIEW rows and concluded
  // they were all benign — audit_logs, profiles, awards, qualification_units and
  // the rest. But none of those carry tenant_id, so none of them drive this
  // verdict at all. Filtering to tenant-columned tables left exactly THREE, and
  // 15 of the 26 rows point at a genuine one: financial_viability_snapshots,
  // whose read predicate is the tenant-BLIND is_gto_admin(). Dismissing the
  // whole set would have thrown away a real finding.
  const tenantTables = row.tables.filter(t => dbTables.get(t)?.has_tenant_id);
  const SCOPED_ENOUGH = ['RLS_ON_TENANT_SCOPED', 'RLS_ON_MIXED', 'RLS_ON_OWNER_SCOPED'];
  row.tenant_scoped = tenantTables.length === 0 ? 'n/a'
    : tenantTables.every(t => SCOPED_ENOUGH.includes(row.rls[t])) ? 'yes'
    : 'PARTIAL';

  const postures = Object.values(row.rls);
  const missingFn = row.edge_fns.filter(f => !deployed.has(f));
  if (postures.includes('RLS_OFF_GRANTED')) row.verdict = 'FINDING_RLS_OFF';
  else if (postures.includes('RLS_ON_PERMISSIVE_TENANT_TABLE')) row.verdict = 'FINDING_CROSS_TENANT';
  else if (missingFn.length) { row.verdict = 'FINDING_CALLER_NO_FUNCTION'; row.note = 'calls undeployed: ' + missingFn.join(','); }
  else if (row.tables.length === 0 && row.rpcs.length === 0 && row.edge_fns.length === 0
           && row.tables_via_shared.length === 0) {
    row.verdict = acc.truncated ? 'UNRESOLVED' : 'NO_DATA_PATH';
    row.note = acc.truncated ? 'import walk hit the file cap — coverage incomplete for this route'
                             : 'static route: no table, rpc or edge function reachable in ' + acc.files + ' files';
  }
  else if (postures.includes('RLS_ON_ZERO_POLICY')) row.verdict = 'REVIEW_RLS_ZERO_POLICY';
  else if (row.tenant_scoped === 'PARTIAL') row.verdict = 'REVIEW_TENANT_PARTIAL';
  else row.verdict = 'OK';
  rows.push(row);
}

// ---------------------------------------------------------------- SANITY GATE
// A builder that cannot see the apps still produces a full-length file — 555
// rows, every one UNRESOLVED — and that artefact is indistinguishable from a
// real map until somebody reads the verdict column. It happened on 2026-08-26:
// run inside a PARENT worktree this emitted 555 rows, 502 of them UNRESOLVED,
// and EXITED 0.
//
// The apps are git SUBMODULES. In a parent worktree they are empty directories
// that pass every existence check, so the import walker found no component files
// and recorded that as a measurement. The output would then have overwritten a
// good map with a bad one that looks fine.
//
// Refuse to write in that case. "Checked nothing" must not be able to overwrite
// "found something". This is the rule the CHECKER already carries, applied to the
// thing that WRITES the artefact — a gate on the reader does not help if the
// writer can quietly produce garbage.
const unresolved = rows.filter(r => r.verdict === 'UNRESOLVED').length;
const live = rows.filter(r => r.status !== 'redirect').length;
const unresolvedShare = live ? unresolved / live : 1;
if (unresolvedShare > 0.15) {
  console.error(`\nREFUSING TO WRITE: ${unresolved} of ${live} live routes are UNRESOLVED ` +
    `(${Math.round(unresolvedShare * 100)}%).`);
  console.error('  That is not a measurement, it is a builder that could not see the apps.');
  console.error('  The apps are git SUBMODULES. In a parent worktree they are empty directories');
  console.error('  that pass every existence check. Run this from a tree where they are checked');
  console.error('  out, or `git submodule update --init --recursive` first.');
  console.error('  Expected share on a healthy run: about 2%.');
  process.exit(1);
}

// deployed-with-no-caller
const noCaller = [...deployed].filter(f => !fnCallers.has(f)).sort();

fs.mkdirSync(path.join(SP, 'surface'), { recursive: true });
fs.writeFileSync(path.join(SP, 'surface/route-surface-map.json'),
  JSON.stringify({ generated_from: 'docs/nav/route-inventory.json schema 3',
                   routes: rows.length, rows,
                   edge_fn_callers: Object.fromEntries(fnCallers),
                   edge_fn_deployed_no_caller: noCaller }, null, 1));

// ---- summary to stdout (this is the measurement, print it)
const c = {};
for (const r of rows) c[r.verdict] = (c[r.verdict] || 0) + 1;
console.log('rows:', rows.length);
console.log('verdicts:', JSON.stringify(c, null, 1));
console.log('routes with >=1 table:', rows.filter(r => r.tables.length).length);
console.log('distinct tables reached:', new Set(rows.flatMap(r => r.tables)).size, 'of', dbTables.size);
console.log('distinct rpcs reached:', new Set(rows.flatMap(r => r.rpcs)).size);
console.log('edge fns with a route caller:', fnCallers.size, '/ deployed', deployed.size);
console.log('edge fns deployed, NO caller:', noCaller.length, noCaller.join(' '));
