#!/usr/bin/env node
/**
 * check-route-surface-map.mjs — the route map is a GATE, not a snapshot.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * `docs/nav/route-inventory.json` carried `data_tables` and `owned_entities` on
 * every one of its 553 routes and BOTH WERE EMPTY ON ALL 553. Nothing noticed,
 * because nothing checked. A document that records a join once is a snapshot
 * that starts rotting the next time a route is added; only a gate keeps it true.
 *
 * WHAT IT ENFORCES — three things, each of which has already gone wrong here:
 *
 *   R1  Every route in the inventory has a row in the surface map.
 *       A route added without being mapped is a screen nobody has traced to its
 *       data, and it is invisible precisely because it is new.
 *
 *   R2  Every row carries a verdict from the closed vocabulary, and a row that
 *       could not be resolved says UNRESOLVED. "Checked nothing" and "found
 *       nothing" must never share an output. A blank verdict is a FAIL, not a pass.
 *
 *   R3  Every edge-function slug invoked from app source is in the deployed list.
 *       This is the live class: throughput/src/pages/Export.tsx:106 invokes
 *       `export`, which is not deployed, so that button fails for every user.
 *       A slug can be a literal, a template literal, or a raw fetch of
 *       `/functions/v1/<slug>` — matching only the first form is how this stayed
 *       invisible.
 *
 * FAIL-CLOSED, AND IT SELF-TESTS
 * If an input is missing or unparseable the gate FAILS and says which — it never
 * exits 0 having checked nothing. `--self-test` feeds it three known-bad fixtures
 * and requires it to reject all three; a gate that has never been shown to fail
 * is not evidence that anything passed.
 *
 * WHAT IT DELIBERATELY DOES NOT CHECK
 * RLS posture and table reachability need live database metadata, which CI has no
 * credentials for. Checking them here would mean either committing a stale copy
 * of production's security state or skipping silently — and a gate that SKIPS
 * what it cannot reach reports coverage it does not have. Those live in
 * `scripts/build-surface-map.mjs`, run against the database by hand.
 */
import fs from 'node:fs';
import path from 'node:path';

const VERDICTS = new Set([
  'OK', 'REDIRECT', 'NO_DATA_PATH', 'UNRESOLVED',
  'REVIEW_TENANT_PARTIAL', 'REVIEW_RLS_ZERO_POLICY',
  'FINDING_RLS_OFF', 'FINDING_CROSS_TENANT', 'FINDING_CALLER_NO_FUNCTION',
]);

/**
 * R3 RATCHET. The gate is RED on the estate today because there IS a live bug:
 * `export` is invoked and not deployed. Making it blocking outright would stop
 * every unrelated PR until that one fix lands, so it is ratcheted instead — the
 * estate's own rule for a backlog that cannot be cleared in one move: make the
 * count only ever shrink.
 *
 * A NEW un-deployed slug fails immediately. A known one is reported and tolerated
 * until it is fixed, and the moment the count drops this list must be trimmed —
 * a ratchet that is never tightened is a permanent exemption wearing a gate's name.
 */
const R3_KNOWN_UNDEPLOYED = new Set([
  // throughput/src/pages/Export.tsx:106 — owned by the Silo B lane, 2026-08-26.
  // Remove this entry the moment that PR lands; the gate then blocks any recurrence.
  'export',
]);

const APP_SRC = [
  'crm7/src', 'business-suite-unified/src', 'conduit/src',
  'braden/src', 'throughput/src', 'R80.4/src',
];

function readJson(p, label, fails) {
  if (!fs.existsSync(p)) {
    fails.push(`MISSING INPUT: ${label} (${p}) — cannot check, so this is a FAIL, not a skip`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    fails.push(`UNPARSEABLE INPUT: ${label} (${p}) — ${e.message}`);
    return null;
  }
}

/** Every edge-function slug invoked anywhere under a source root. */
function invokedSlugs(roots) {
  const found = new Map(); // slug -> "file:line"
  const stack = roots.filter((r) => fs.existsSync(r));
  const PATTERNS = [
    /functions\s*\.\s*invoke\(\s*["'`]([A-Za-z0-9_-]+)["'`]/g,
    /functions\/v1\/([A-Za-z0-9_-]+)/g,
  ];
  while (stack.length) {
    const p = stack.pop();
    let st;
    try {
      st = fs.statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      // A worktree is a second copy of the tree; counting it measures the past.
      if (/node_modules|\.claude|\.superpowers|\.vercel|dist|build|coverage/.test(p)) continue;
      for (const e of fs.readdirSync(p)) stack.push(path.join(p, e));
      continue;
    }
    if (!/\.(ts|tsx|js|jsx)$/.test(p)) continue;
    if (/\.test\.|\.spec\.|__tests__|__mocks__/.test(p)) continue;
    const src = fs.readFileSync(p, 'utf8');
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(src))) {
        if (found.has(m[1])) continue;
        const line = src.slice(0, m.index).split('\n').length;
        found.set(m[1], `${p}:${line}`);
      }
    }
  }
  return found;
}

function run(root) {
  const fails = [];
  const notes = [];
  const inv = readJson(path.join(root, 'docs/nav/route-inventory.json'), 'route inventory', fails);
  const map = readJson(path.join(root, 'docs/nav/route-surface-map.json'), 'route surface map', fails);
  const dep = readJson(path.join(root, 'docs/nav/edge-functions-deployed.json'), 'deployed edge functions', fails);
  if (fails.length) return { fails, notes, checked: 0 };

  // R1 — every inventory route is mapped.
  const mapped = new Set(map.rows.map((r) => `${r.app} ${r.route}`));
  const unmapped = inv.routes.filter((r) => !mapped.has(`${r.app} ${r.path}`));
  for (const r of unmapped.slice(0, 20)) {
    fails.push(`R1 UNMAPPED ROUTE: ${r.app} ${r.path} (${r.route_file})`);
  }
  if (unmapped.length > 20) fails.push(`R1 ...and ${unmapped.length - 20} more unmapped routes`);

  // R2 — every row has a verdict from the closed vocabulary.
  for (const r of map.rows) {
    if (!r.verdict) {
      fails.push(`R2 BLANK VERDICT: ${r.app} ${r.route} — a blank is "checked nothing", which is a FAIL`);
    } else if (!VERDICTS.has(r.verdict)) {
      fails.push(`R2 UNKNOWN VERDICT "${r.verdict}": ${r.app} ${r.route}`);
    }
  }

  // R3 — every invoked edge-function slug is deployed.
  const deployed = new Set(dep.functions ?? dep);
  const invoked = invokedSlugs(APP_SRC.map((s) => path.join(root, s)));
  const stillBroken = [];
  for (const [slug, where] of invoked) {
    if (deployed.has(slug)) continue;
    if (R3_KNOWN_UNDEPLOYED.has(slug)) {
      stillBroken.push(slug);
      notes.push(`R3 KNOWN, RATCHETED: "${slug}" at ${where} — still broken, still counted. Not a pass.`);
      continue;
    }
    fails.push(`R3 CALLER WITH NO DEPLOYED FUNCTION: "${slug}" invoked at ${where} — that control fails for every user`);
  }
  for (const slug of R3_KNOWN_UNDEPLOYED) {
    if (!stillBroken.includes(slug)) {
      fails.push(`R3 RATCHET NOT TIGHTENED: "${slug}" is no longer broken — remove it from R3_KNOWN_UNDEPLOYED so the gate blocks a recurrence`);
    }
  }

  notes.push(`inventory routes ${inv.routes.length} - mapped rows ${map.rows.length} - edge slugs invoked ${invoked.size} - deployed ${deployed.size}`);
  notes.push(`deployed list captured ${dep.captured_at ?? 'UNDATED - re-capture it'}`);
  if (invoked.size === 0) {
    notes.push('NOTE: zero edge-function call sites seen. In the parent repo the apps are submodules; if they are not checked out, R3 examined nothing.');
  }
  return { fails, notes, checked: inv.routes.length + map.rows.length + invoked.size };
}

// ------------------------------------------------------------------ self-test
function selfTest() {
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'rsm-'));
  const nav = path.join(tmp, 'docs/nav');
  fs.mkdirSync(nav, { recursive: true });
  const write = (f, o) => fs.writeFileSync(path.join(nav, f), JSON.stringify(o));
  const cases = [
    ['a route present in the inventory but absent from the map', () => {
      write('route-inventory.json', { routes: [{ app: 'crm7', path: '/x', route_file: 'f' }] });
      write('route-surface-map.json', { rows: [] });
      write('edge-functions-deployed.json', { functions: [] });
    }],
    ['a mapped row with a blank verdict', () => {
      write('route-inventory.json', { routes: [{ app: 'crm7', path: '/x', route_file: 'f' }] });
      write('route-surface-map.json', { rows: [{ app: 'crm7', route: '/x', verdict: '' }] });
      write('edge-functions-deployed.json', { functions: [] });
    }],
    ['an input file that does not exist at all', () => {
      fs.rmSync(path.join(nav, 'route-surface-map.json'), { force: true });
    }],
  ];
  let ok = true;
  for (const [name, setup] of cases) {
    setup();
    const { fails } = run(tmp);
    const rejected = fails.length > 0;
    console.log(`  ${rejected ? 'rejected' : 'ACCEPTED'}  ${name}`);
    if (!rejected) ok = false;
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(ok
    ? '\ncheck-route-surface-map self-test: OK - the gate rejects all 3 known-bad inputs'
    : '\ncheck-route-surface-map self-test: FAILED - a gate that cannot fail proves nothing');
  return ok ? 0 : 1;
}

if (process.argv.includes('--self-test')) process.exit(selfTest());

const root = process.argv[2] || process.cwd();
const { fails, notes, checked } = run(root);
for (const n of notes) console.log('  ' + n);
if (fails.length) {
  console.log('');
  for (const f of fails) console.log('  FAIL ' + f);
  console.log(`\ncheck-route-surface-map: FAIL - ${fails.length} problem(s) over ${checked} checked item(s).`);
  console.log('  Regenerate with: node scripts/build-surface-map.mjs && node scripts/export-surface-map.mjs');
  process.exit(1);
}
console.log(`\ncheck-route-surface-map: OK - ${checked} item(s) checked, 0 problem(s).`);
