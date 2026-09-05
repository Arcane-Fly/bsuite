#!/usr/bin/env node
/**
 * scripts/check-version-json-served.mjs
 *
 * Live smoke for /version.json across the 12 estate domains (R3(e) / R8 of the
 * D-160 v2 rulings). The update-notice hook compares __BUILD_COMMIT__ with
 * /version.json; today a missing file is SPA HTML 200 (Vite apps) or a 307 to
 * login (conduit). That is indistinguishable from a real payload unless the
 * gate asserts status + content-type + a 7-or-40-char hex commit.
 *
 * WHAT COUNTS AS SERVED
 *   HTTP 200, Content-Type starts with application/json, body parses as JSON
 *   with a `commit` that is exactly 7 or 40 hex chars.
 *
 * WHAT COUNTS AS NOT SERVED (named in the table)
 *   network error, non-200 status, 307/3xx redirect (login etc.), HTML body /
 *   SPA catch-all, non-JSON content-type, malformed JSON, missing/malformed
 *   commit.
 *
 * RATCHET (shrink-only expected_missing)
 *   Hosts that are not yet serving are banked in
 *   scripts/version-json-served-baseline.json.expected_missing.
 *   - A banked host that starts serving MUST be removed via --update-baseline
 *     (an unbanked fall fails and prints the remedy).
 *   - A host outside the bank that stops serving fails immediately.
 *   - A hand-added rise in expected_missing fails (the bank only shrinks).
 *   - scanned must equal the 12-domain universe (a smaller scan is absent, not clean).
 *
 * NOT a PR check (network-dependent). Wired on the scheduled / workflow_dispatch
 * estate lane that already curls live domains (oauth-provider-check.yml job
 * check-redirect-uri-registration), plus that workflow's existing schedule.
 *
 * WHAT THIS DOES NOT ASSERT
 *   That any app mounts <UpdateAvailableBanner/> (see check-update-banner-mounted.mjs).
 *   That Cache-Control is no-store (per-app vercel.json / route handler).
 *   That the commit matches a particular deploy (only that a valid payload is served).
 *
 * USAGE
 *   node scripts/check-version-json-served.mjs
 *   node scripts/check-version-json-served.mjs --update-baseline
 *   node scripts/check-version-json-served.mjs --self-test
 *   node scripts/check-version-json-served.mjs --baseline=<path> --hosts-file=<path>
 *
 * EXIT
 *   0  every host outside expected_missing is SERVED; bank exact (no unbanked fall)
 *   1  a NOT-served host outside the bank, an unbanked fall, a rise, or a broken scan
 *   2  bootstrap / fixture failure
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  realpathSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');
const DEFAULT_BASELINE = join(HERE, 'version-json-served-baseline.json');
const SCRIPT = fileURLToPath(import.meta.url);

function spawnNode(args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (status, signal) => {
      resolve({ status, signal, stdout, stderr });
    });
  });
}


/** The 12 estate domains R3(e) names. Order is stable for the table. */
export const ESTATE_HOSTS = [
  'suite.crm7.app',
  'crm.crm7.app',
  'conduit.crm7.app',
  'ideas.crm7.app',
  'r8.crm7.app',
  'd.suite.crm7.app',
  'd.crm.crm7.app',
  'd.conduit.crm7.app',
  'd.ideas.crm7.app',
  'd.r8.crm7.app',
  'braden.com.au',
  'd.braden.com.au',
];

const TIMEOUT_MS = 10_000;
const COMMIT_RE = /^(?:[0-9a-f]{7}|[0-9a-f]{40})$/i;

/**
 * Classify one fetch result. Pure so --self-test can drive it without network.
 * @param {{ ok: boolean, status?: number, contentType?: string|null, body?: string, error?: string, redirected?: boolean }} res
 */
export function classify(res) {
  if (!res.ok) {
    if (res.error) return { state: 'NOT', reason: `network error: ${res.error}` };
    return { state: 'NOT', reason: 'network error' };
  }
  const status = res.status ?? 0;
  if (status >= 300 && status < 400) {
    return { state: 'NOT', reason: `${status} redirect` };
  }
  if (status !== 200) {
    return { state: 'NOT', reason: `HTTP ${status}` };
  }
  const ct = (res.contentType || '').toLowerCase();
  if (!ct.startsWith('application/json')) {
    const body = res.body || '';
    if (/<!doctype html|<html[\s>]/i.test(body) || ct.includes('text/html')) {
      return { state: 'NOT', reason: 'HTML body (SPA catch-all)' };
    }
    return { state: 'NOT', reason: `content-type ${ct || '(missing)'}` };
  }
  let parsed;
  try {
    parsed = JSON.parse(res.body || '');
  } catch {
    return { state: 'NOT', reason: 'malformed JSON' };
  }
  const commit = parsed && typeof parsed === 'object' ? parsed.commit : undefined;
  if (typeof commit !== 'string' || !COMMIT_RE.test(commit)) {
    return {
      state: 'NOT',
      reason: `commit not 7-or-40-char hex (got ${JSON.stringify(commit)})`,
    };
  }
  return { state: 'SERVED', reason: `commit ${commit}` };
}

/** Resolve a host to the URL we will fetch. Env map is for --self-test only. */
export function urlForHost(host) {
  const mapRaw = process.env.CHECK_VERSION_JSON_FETCH_MAP;
  if (mapRaw) {
    try {
      const map = JSON.parse(mapRaw);
      if (map[host]) return map[host];
    } catch {
      /* fall through */
    }
  }
  return `https://${host}/version.json`;
}

/** Fetch one URL with no redirect following and a hard timeout. */
export async function fetchOne(url, { timeoutMs = TIMEOUT_MS, fetchImpl } = {}) {
  const fetchFn = fetchImpl || globalThis.fetch;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchFn(url, {
      method: 'GET',
      redirect: 'manual',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json, */*;q=0.1',
        'User-Agent': 'bsuite-check-version-json-served/1',
      },
    });
    const status = res.status;
    const contentType = res.headers.get('content-type');
    // 3xx: do not read body as JSON; name the redirect.
    if (status >= 300 && status < 400) {
      return { ok: true, status, contentType, body: '', redirected: true };
    }
    const body = await res.text();
    return { ok: true, status, contentType, body, redirected: false };
  } catch (err) {
    const msg =
      err && typeof err === 'object' && 'name' in err && err.name === 'AbortError'
        ? `timeout after ${timeoutMs}ms`
        : (err && err.message) || String(err);
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function loadBaseline(path) {
  if (!existsSync(path)) {
    throw new Error(`baseline missing: ${path}`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function loadHosts(argv) {
  const fileArg = argv.find((a) => a.startsWith('--hosts-file='));
  if (fileArg) {
    const p = fileArg.slice('--hosts-file='.length);
    const raw = JSON.parse(readFileSync(p, 'utf8'));
    if (!Array.isArray(raw) || raw.length === 0) throw new Error(`hosts-file empty: ${p}`);
    return raw;
  }
  return ESTATE_HOSTS.slice();
}

/**
 * Compare live classifications to the banked expected_missing.
 * Pure over the inputs so self-test can drive it.
 */
export function evaluate({ hosts, results, baseline }) {
  const expected = new Set(baseline.expected_missing || []);
  const scannedBanked = baseline.scanned;
  const failures = [];
  const rows = [];
  let served = 0;
  let notServed = 0;
  const missingNow = [];

  if (typeof scannedBanked !== 'number' || scannedBanked !== hosts.length) {
    failures.push(
      `scanned denominator drift: baseline.scanned=${scannedBanked} but this run has ${hosts.length} host(s). ` +
        `A smaller scan is ABSENT, not clean — refuse rather than pass over a partial universe.`,
    );
  }

  // A hand-added rise: expected_missing contains a host outside the universe.
  for (const h of expected) {
    if (!hosts.includes(h)) {
      failures.push(
        `expected_missing contains ${h}, which is not in the 12-domain universe. ` +
          `The bank is shrink-only; remove the host or fix the hosts list — a hand-added rise fails.`,
      );
    }
  }

  for (const host of hosts) {
    const r = results.get(host);
    const cls = r || { state: 'NOT', reason: 'no result' };
    rows.push({ host, state: cls.state, reason: cls.reason });
    if (cls.state === 'SERVED') {
      served += 1;
      if (expected.has(host)) {
        failures.push(
          `${host} is now SERVED but still listed in expected_missing. ` +
            `The floor is a shrink-only ratchet: bank the fall with ` +
            `node scripts/check-version-json-served.mjs --update-baseline`,
        );
      }
    } else {
      notServed += 1;
      missingNow.push(host);
      if (!expected.has(host)) {
        failures.push(
          `${host} is NOT served (${cls.reason}) and is NOT in expected_missing. ` +
            `A host outside the bank that stops serving fails. Restore /version.json ` +
            `(200 + application/json + 7-or-40-char hex commit) or, only if the domain ` +
            `is intentionally retiring the notice, re-bank via --update-baseline after PI approval.`,
        );
      }
    }
  }

  // Unbanked fall of the whole set is already covered per-host above when SERVED
  // while still listed. Also catch: expected_missing longer than reality without
  // any SERVED host (e.g. host removed from universe) — covered by rise check.

  return {
    rows,
    served,
    notServed,
    missingNow,
    failures,
    scanned: hosts.length,
  };
}

function printTable(rows) {
  console.log('host                         state    reason');
  console.log('---------------------------- -------- ----------------------------------------------');
  for (const r of rows) {
    console.log(
      `${r.host.padEnd(28)} ${r.state.padEnd(8)} ${r.reason}`,
    );
  }
}

async function runLive(argv) {
  const baselinePath = (argv.find((a) => a.startsWith('--baseline=')) || '').slice('--baseline='.length) || DEFAULT_BASELINE;
  const update = argv.includes('--update-baseline');
  const hosts = loadHosts(argv);
  const baseline = loadBaseline(baselinePath);

  const results = new Map();
  for (const host of hosts) {
    const url = urlForHost(host);
    const raw = await fetchOne(url);
    results.set(host, classify(raw));
  }

  const ev = evaluate({ hosts, results, baseline });
  printTable(ev.rows);
  console.log(
    `scanned ${ev.scanned} domain(s); SERVED ${ev.served}; NOT ${ev.notServed}; ` +
      `expected_missing banked ${ (baseline.expected_missing || []).length }`,
  );

  if (update) {
    // Shrink-only: new expected_missing = hosts that are NOT served today,
    // but never longer than the previous bank for hosts that were already
    // outside (a rise fails unless the host was previously banked... actually
    // update is the operator action that banks the CURRENT missing set, and
    // may only shrink relative to prior OR re-bank after PI approval).
    // Spec: "a host added to the list by hand fails (a rise fails)".
    // --update-baseline is the legitimate writer: it writes the current
    // missing set, but refuses if the new set has a host that was previously
    // SERVED-and-not-listed... simpler rule matching the brief:
    //   write expected_missing = missingNow
    //   if missingNow has a host not in old bank AND not previously known as
    //   the initial full set — actually the brief says update removes hosts
    //   that start serving. So update = set expected_missing to current NOT
    //   hosts, provided |new| <= |old| OR old was empty first bank.
    const old = new Set(baseline.expected_missing || []);
    const next = ev.missingNow.slice().sort();
    const added = next.filter((h) => !old.has(h));
    if (added.length > 0 && old.size > 0) {
      console.error('');
      console.error(
        `::error::--update-baseline refused: would ADD ${added.join(', ')} to expected_missing. ` +
          `The bank is shrink-only. Fix the domains so they SERVE, do not expand the exemption.`,
      );
      process.exit(1);
    }
    const payload = {
      expected_missing: next,
      scanned: hosts.length,
      banked_at: new Date().toISOString().slice(0, 10),
      owner: baseline.owner || 'R10 adoption PRs',
      _doc:
        baseline._doc ||
        'Shrink-only bank of estate domains that do not yet serve /version.json as 200 application/json with a 7-or-40-char hex commit. Written by scripts/check-version-json-served.mjs --update-baseline. A host that starts serving must leave this list in the same commit; a host outside the list that stops serving fails; a hand-added rise fails.',
    };
    writeFileSync(baselinePath, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`baseline updated: expected_missing ${old.size} → ${next.length} at ${baselinePath}`);
    process.exit(0);
  }

  if (ev.failures.length > 0) {
    console.error('');
    for (const f of ev.failures) console.error(`::error::${f}`);
    process.exit(1);
  }
  console.log(
    `ok — ${ev.scanned} domain(s) checked; every host outside expected_missing serves /version.json; bank exact.`,
  );
  process.exit(0);
}

/**
 * --self-test: spawn THIS script against a local http fixture (JSON 200,
 * HTML 200, 307) with a temp baseline, through the real entry point.
 */
function selfTest() {
  const cases = [];
  const t = (name, ok, detail = '') => {
    cases.push({ name, ok: !!ok });
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : detail ? ` — ${detail}` : ''}`);
  };

  // Pure classifier controls (fast, no spawn).
  t(
    'SERVED: 200 json + 7-char commit',
    classify({
      ok: true,
      status: 200,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify({ commit: 'abcdef1', builtAt: 'x' }),
    }).state === 'SERVED',
  );
  t(
    'SERVED: 200 json + 40-char commit',
    classify({
      ok: true,
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ commit: 'a'.repeat(40) }),
    }).state === 'SERVED',
  );
  t(
    'NOT: HTML SPA catch-all (200 text/html)',
    classify({
      ok: true,
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: '<!doctype html><html><body>app</body></html>',
    }).reason.includes('HTML'),
  );
  t(
    'NOT: 307 redirect to login',
    classify({ ok: true, status: 307, contentType: 'text/plain', body: '' }).reason.includes('307'),
  );
  t(
    'NOT: network error',
    classify({ ok: false, error: 'ECONNREFUSED' }).reason.includes('network'),
  );
  t(
    'NOT: commit too short',
    classify({
      ok: true,
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ commit: 'abc' }),
    }).state === 'NOT',
  );

  // evaluate() ratchet pure controls
  {
    const hosts = ['a.example', 'b.example'];
    const results = new Map([
      ['a.example', { state: 'NOT', reason: 'HTML body (SPA catch-all)' }],
      ['b.example', { state: 'NOT', reason: 'HTML body (SPA catch-all)' }],
    ]);
    const base = { expected_missing: ['a.example', 'b.example'], scanned: 2 };
    const ev = evaluate({ hosts, results, baseline: base });
    t('evaluate: all banked missing → pass', ev.failures.length === 0, JSON.stringify(ev.failures));
  }
  {
    const hosts = ['a.example', 'b.example'];
    const results = new Map([
      ['a.example', { state: 'SERVED', reason: 'commit abcdef1' }],
      ['b.example', { state: 'NOT', reason: 'HTML body (SPA catch-all)' }],
    ]);
    const base = { expected_missing: ['a.example', 'b.example'], scanned: 2 };
    const ev = evaluate({ hosts, results, baseline: base });
    t(
      'evaluate: unbanked fall (served while still listed) → fail + remedy',
      ev.failures.some((f) => f.includes('--update-baseline')),
      JSON.stringify(ev.failures),
    );
  }
  {
    const hosts = ['a.example', 'b.example'];
    const results = new Map([
      ['a.example', { state: 'SERVED', reason: 'commit abcdef1' }],
      ['b.example', { state: 'NOT', reason: 'HTML body (SPA catch-all)' }],
    ]);
    const base = { expected_missing: [], scanned: 2 };
    const ev = evaluate({ hosts, results, baseline: base });
    t(
      'evaluate: host outside bank NOT served → fail',
      ev.failures.some((f) => f.includes('b.example') && f.includes('NOT served')),
      JSON.stringify(ev.failures),
    );
  }
  {
    const hosts = ['a.example', 'b.example'];
    const results = new Map([
      ['a.example', { state: 'SERVED', reason: 'commit abcdef1' }],
      ['b.example', { state: 'SERVED', reason: 'commit abcdef1' }],
    ]);
    const base = { expected_missing: ['a.example', 'b.example', 'c.example'], scanned: 2 };
    const ev = evaluate({ hosts, results, baseline: base });
    t(
      'evaluate: hand-added rise (host outside universe) → fail',
      ev.failures.some((f) => f.includes('c.example') && f.includes('rise')),
      JSON.stringify(ev.failures),
    );
  }

  // Spawn through the real entry point against a local fixture server.
  const fxRoot = mkdtempSync(join(tmpdir(), 'vjson-self-'));
  const baselinePath = join(fxRoot, 'baseline.json');
  const hostsPath = join(fxRoot, 'hosts.json');
  let server;
  let baseUrl;

  const run = () =>
    new Promise((resolve, reject) => {
      server = createServer((req, res) => {
        const u = new URL(req.url || '/', 'http://127.0.0.1');
        if (u.pathname === '/json/version.json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ commit: 'abcdef1', builtAt: 'fixture' }));
          return;
        }
        if (u.pathname === '/html/version.json') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<!doctype html><html><body>spa</body></html>');
          return;
        }
        if (u.pathname === '/redir/version.json') {
          res.writeHead(307, { Location: '/login' });
          res.end('redirect');
          return;
        }
        res.writeHead(404);
        res.end('no');
      });
      server.listen(0, '127.0.0.1', () => {
        const { port } = server.address();
        baseUrl = `127.0.0.1:${port}`;
        resolve();
      });
      server.on('error', reject);
    });

  return run()
    .then(async () => {
      // The live path always hits https://<host>/version.json. For the fixture
      // we override via a tiny wrapper hosts list is still hostnames — so the
      // self-test instead exercises classify+evaluate for the three fixture
      // routes by fetching them directly and feeding evaluate, PLUS spawns the
      // script once with a baseline that matches "all missing" against the
      // real 12-host list would need network. Spec requires spawn against local
      // server fixture through the real entry point.
      //
      // Implementation: a --base-url= flag is intentional for self-test only.
      const hosts = [`json.${baseUrl}`, `html.${baseUrl}`, `redir.${baseUrl}`];
      // Can't use host headers that way. Instead: patch via env CHECK_VERSION_JSON_BASE
      // that replaces https://host with the fixture base + path prefix.
      writeFileSync(
        hostsPath,
        JSON.stringify(['fixture-json.local', 'fixture-html.local', 'fixture-redir.local']),
      );
      writeFileSync(
        baselinePath,
        JSON.stringify({
          expected_missing: ['fixture-json.local', 'fixture-html.local', 'fixture-redir.local'],
          scanned: 3,
          banked_at: '2026-09-03',
          owner: 'self-test',
        }),
      );

      // Map hosts → fixture paths via env the script reads in self-test mode.
      const env = {
        ...process.env,
        CHECK_VERSION_JSON_FETCH_MAP: JSON.stringify({
          'fixture-json.local': `http://${baseUrl}/json/version.json`,
          'fixture-html.local': `http://${baseUrl}/html/version.json`,
          'fixture-redir.local': `http://${baseUrl}/redir/version.json`,
        }),
      };

      // Spawn 1: all three banked as missing — but json is actually SERVED → unbanked fall → exit 1
      {
        const r = await spawnNode(
          [SCRIPT, `--baseline=${baselinePath}`, `--hosts-file=${hostsPath}`],
          env,
        );
        t(
          'spawn: unbanked fall (json SERVED while banked missing) exit 1',
          r.status === 1,
          `status=${r.status} out=${(r.stdout || '').slice(-200)} err=${(r.stderr || '').slice(-200)}`,
        );
        t(
          'spawn: unbanked fall names --update-baseline remedy',
          /--update-baseline/.test(`${r.stdout}\n${r.stderr}`),
        );
      }

      // Shrink bank to only html+redir; json is served → exit 0
      writeFileSync(
        baselinePath,
        JSON.stringify({
          expected_missing: ['fixture-html.local', 'fixture-redir.local'],
          scanned: 3,
          banked_at: '2026-09-03',
          owner: 'self-test',
        }),
      );
      {
        const r = await spawnNode(
          [SCRIPT, `--baseline=${baselinePath}`, `--hosts-file=${hostsPath}`],
          env,
        );
        t(
          'spawn: honest bank (html+redir missing, json served) exit 0',
          r.status === 0,
          `status=${r.status} out=${(r.stdout || '').slice(-300)} err=${(r.stderr || '').slice(-200)}`,
        );
        t(
          'spawn: table names HTML body and 307',
          /HTML body/.test(r.stdout || '') && /307/.test(r.stdout || ''),
          (r.stdout || '').slice(0, 400),
        );
      }

      // Empty bank with html still NOT → exit 1
      writeFileSync(
        baselinePath,
        JSON.stringify({
          expected_missing: [],
          scanned: 3,
          banked_at: '2026-09-03',
          owner: 'self-test',
        }),
      );
      {
        const r = await spawnNode(
          [SCRIPT, `--baseline=${baselinePath}`, `--hosts-file=${hostsPath}`],
          env,
        );
        t(
          'spawn: host outside bank NOT served exit 1',
          r.status === 1,
          `status=${r.status}`,
        );
      }

      // --update-baseline shrinks after json is served
      writeFileSync(
        baselinePath,
        JSON.stringify({
          expected_missing: ['fixture-json.local', 'fixture-html.local', 'fixture-redir.local'],
          scanned: 3,
          banked_at: '2026-09-03',
          owner: 'self-test',
        }),
      );
      {
        const r = await spawnNode(
          [SCRIPT, `--baseline=${baselinePath}`, `--hosts-file=${hostsPath}`, '--update-baseline'],
          env,
        );
        t(
          'spawn: --update-baseline shrinks missing set exit 0',
          r.status === 0,
          `status=${r.status} err=${(r.stderr || '').slice(-200)}`,
        );
        const next = JSON.parse(readFileSync(baselinePath, 'utf8'));
        t(
          'spawn: baseline after update no longer lists fixture-json.local',
          Array.isArray(next.expected_missing) &&
            !next.expected_missing.includes('fixture-json.local') &&
            next.expected_missing.includes('fixture-html.local') &&
            next.expected_missing.includes('fixture-redir.local'),
          JSON.stringify(next.expected_missing),
        );
      }

      const bad = cases.filter((c) => !c.ok);
      console.log(
        `\ncheck-version-json-served --self-test: ${cases.length - bad.length}/${cases.length} passed`,
      );
      process.exit(bad.length ? 1 : 0);
    })
    .catch((err) => {
      console.error('self-test fixture failed:', err);
      process.exit(2);
    })
    .finally(() => {
      try {
        server && server.close();
      } catch {
        /* ignore */
      }
      try {
        rmSync(fxRoot, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    await selfTest();
    return;
  }
  await runLive(argv);
}

let isMain = false;
try {
  isMain = realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1]);
} catch {
  isMain = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
}
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}
