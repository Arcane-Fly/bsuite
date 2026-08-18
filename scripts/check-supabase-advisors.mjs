#!/usr/bin/env node
/**
 * Supabase advisor sweep (§12.1.3 / FF-SUPABASE-GATES-20260610).
 *
 * Fetches security + performance advisors from the Supabase Management API
 * (the CI-available equivalent of the MCP get_advisors tool) and compares
 * findings against the checked-in allowlist
 * docs/security/supabase-advisor-allowlist.json.
 *
 * Verdicts:
 *   - SECURITY finding (WARN/ERROR) not allowlisted  -> exit 1 (fails CI)
 *   - PERFORMANCE finding (WARN/ERROR) not allowlisted -> reported for
 *     issue filing (perf-findings.md), exit 0
 *   - INFO-level findings never fail; counted in the report only
 *   - mode=accepted / mode=tracked rules suppress both failure and filing
 *
 * Evidence outputs (never dashboard counters — §12.1.1):
 *   - advisor-report.json    full categorized payload (artifact)
 *   - perf-findings.md       issue body for unallowlisted performance WARNs
 *   - GITHUB_STEP_SUMMARY    human summary
 *   - GITHUB_OUTPUT          perf_findings=true|false, new_security=N
 *
 * Env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_ID
 * Self-test: node scripts/check-supabase-advisors.mjs --self-test
 */
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_PATH = resolve(ROOT, 'docs/security/supabase-advisor-allowlist.json');

function objectIdentity(lint) {
  const m = lint.metadata ?? {};
  if (m.type === 'function' || m.arguments !== undefined) {
    return `${m.name}(${m.arguments ?? ''})`;
  }
  return m.name ?? lint.cache_key ?? lint.detail?.slice(0, 80) ?? 'unknown';
}

function loadAllowlist() {
  const doc = JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8'));
  return doc.rules ?? [];
}

function matchRule(rules, lint) {
  const id = objectIdentity(lint);
  for (const rule of rules) {
    if (rule.lint !== lint.name) continue;
    if (rule.objects.includes('*') || rule.objects.includes(id)) return rule;
  }
  return null;
}

async function fetchAdvisors(kind) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const ref = process.env.SUPABASE_PROJECT_ID;
  if (!token || !ref) {
    console.error('::error::SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_ID not set');
    process.exit(2);
  }
  // RETRY TRANSIENTS, and say which failure this is.
  //
  // 2026-08-18: this gate went red on three PRs with
  //     ::error::advisor API security returned HTTP 408
  // A 408 is the advisor API timing out. Nothing was wrong with the database and
  // nothing had been advised — but the job is named "Advisor sweep (security
  // fails …)", so every reader saw a SECURITY failure on their change.
  //
  // That is the same defect class this estate has hit four times now: an
  // infrastructure fault wearing a finding's name. A gate must never confound
  // its instrument with its measurement. Failing when the advisor is genuinely
  // unreachable is right — an unrun check is not a pass — but it must retry
  // first, and it must say "could not ASK" rather than implying "was told".
  const TRANSIENT = new Set([408, 425, 429, 500, 502, 503, 504]);
  const ATTEMPTS = 4;
  let res;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      res = await fetch(
        `https://api.supabase.com/v1/projects/${ref}/advisors/${kind}`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(45_000) },
      );
    } catch (err) {
      // A network error or our own 45s abort — indistinguishable from a 5xx for
      // our purposes, and equally worth another attempt.
      lastStatus = 0;
      if (attempt === ATTEMPTS) {
        console.error(
          `::error::advisor API ${kind} UNREACHABLE after ${ATTEMPTS} attempts (${err?.name ?? 'error'}: ${err?.message ?? 'no message'}). ` +
            `This is a failure to ASK the advisor, NOT an advisory finding — the database may be perfectly healthy. ` +
            `The gate still fails, because an unrun check is not a pass.`,
        );
        process.exit(2);
      }
      await new Promise((r) => setTimeout(r, 2000 * 2 ** (attempt - 1)));
      continue;
    }
    if (res.ok) break;
    lastStatus = res.status;
    if (!TRANSIENT.has(res.status) || attempt === ATTEMPTS) {
      const kindOfFault = TRANSIENT.has(res.status)
        ? `UNREACHABLE after ${ATTEMPTS} attempts`
        : 'REFUSED the request';
      console.error(
        `::error::advisor API ${kind} ${kindOfFault} — HTTP ${res.status}. ` +
          `This is a failure to ASK the advisor, NOT an advisory finding. ` +
          `${res.status === 401 || res.status === 403 ? 'Check SUPABASE_ACCESS_TOKEN.' : ''}`,
      );
      process.exit(2);
    }
    // Exponential backoff: 2s, 4s, 8s.
    const waitMs = 2000 * 2 ** (attempt - 1);
    console.log(`advisor API ${kind} HTTP ${res.status} (transient) — retrying in ${waitMs / 1000}s (attempt ${attempt}/${ATTEMPTS})`);
    await new Promise((r) => setTimeout(r, waitMs));
  }
  if (!res || !res.ok) {
    console.error(`::error::advisor API ${kind} unreachable (last status ${lastStatus}). Failure to ASK, not a finding.`);
    process.exit(2);
  }
  const body = await res.json();
  return body.lints ?? [];
}

function selfTestFixtures() {
  const secdefRule = loadAllowlist().find(
    (r) => r.lint === 'authenticated_security_definer_function_executable',
  );
  const knownFn = secdefRule.objects[0];
  const [name, args] = [knownFn.slice(0, knownFn.indexOf('(')), knownFn.slice(knownFn.indexOf('(') + 1, -1)];
  return {
    security: [
      // allowlisted helper -> must be accepted
      { name: 'authenticated_security_definer_function_executable', level: 'WARN', detail: 'known helper', metadata: { name, arguments: args, type: 'function' } },
      // NEW unallowlisted SECDEF fn -> must fail
      { name: 'authenticated_security_definer_function_executable', level: 'WARN', detail: 'evil_new_fn', metadata: { name: 'evil_new_fn', arguments: '', type: 'function' } },
    ],
    performance: [
      // tracked mpp table -> suppressed
      { name: 'multiple_permissive_policies', level: 'WARN', detail: 'tracked', metadata: { name: 'timesheets', type: 'table' } },
      // tracked auth_rls_initplan table -> suppressed (bsuite#1542)
      { name: 'auth_rls_initplan', level: 'WARN', detail: 'tracked initplan', metadata: { name: 'some_new_table', type: 'table' } },
      // NEW perf WARN -> filed, not failed
      { name: 'unused_rls_index', level: 'WARN', detail: 'new unused index issue', metadata: { name: 'some_other_table', type: 'table' } },
      // INFO -> report-only
      { name: 'unused_index', level: 'INFO', detail: 'idx', metadata: { name: 'idx_x', type: 'index' } },
    ],
  };
}

function categorize(rules, lints) {
  const out = { failed: [], filed: [], accepted: [], tracked: [], info: [] };
  for (const lint of lints) {
    if (lint.level === 'INFO') { out.info.push(lint); continue; }
    const rule = matchRule(rules, lint);
    if (rule) {
      (rule.mode === 'tracked' ? out.tracked : out.accepted).push({ lint, rule });
      continue;
    }
    if ((lint.categories ?? []).includes('SECURITY')) out.failed.push(lint);
    else out.filed.push(lint);
  }
  return out;
}

const selfTest = process.argv.includes('--self-test');
const rules = loadAllowlist();
const data = selfTest
  ? selfTestFixtures()
  : { security: await fetchAdvisors('security'), performance: await fetchAdvisors('performance') };

const sec = categorize(rules, data.security);
const perf = categorize(rules, data.performance);
// Security lints carry categories:["SECURITY"]; if absent (fixtures), treat sec list as security.
const newSecurity = [...sec.failed, ...sec.filed.splice(0)];
const newPerf = perf.filed;

const report = {
  generated: new Date().toISOString(),
  project: process.env.SUPABASE_PROJECT_ID ?? 'self-test',
  summary: {
    security_total: data.security.length,
    performance_total: data.performance.length,
    new_security: newSecurity.length,
    new_performance: newPerf.length,
    accepted: sec.accepted.length + perf.accepted.length,
    tracked: sec.tracked.length + perf.tracked.length,
    info: sec.info.length + perf.info.length,
  },
  new_security: newSecurity,
  new_performance: newPerf,
  tracked: [...sec.tracked, ...perf.tracked].map(({ lint, rule }) => ({
    lint: lint.name, object: objectIdentity(lint), tracked_in: rule.tracked_in,
  })),
};
writeFileSync('advisor-report.json', JSON.stringify(report, null, 2));

for (const lint of newSecurity) {
  console.log(`::error title=New security advisor finding::${lint.name} — ${objectIdentity(lint)}: ${(lint.detail ?? '').slice(0, 300)}`);
}
for (const lint of newPerf) {
  console.log(`::warning title=New performance advisor finding::${lint.name} — ${objectIdentity(lint)}: ${(lint.detail ?? '').slice(0, 300)}`);
}

if (newPerf.length > 0) {
  const body = [
    '## Supabase performance advisor findings (auto-filed by supabase-advisor-sweep)',
    '',
    `Run: ${process.env.GITHUB_SERVER_URL ?? ''}/${process.env.GITHUB_REPOSITORY ?? ''}/actions/runs/${process.env.GITHUB_RUN_ID ?? 'local'}`,
    '',
    ...newPerf.map((l) => [
      `### \`${l.name}\` — \`${objectIdentity(l)}\``,
      '',
      `**Level:** ${l.level}`,
      `**Detail:** ${l.detail}`,
      `**Remediation:** ${l.remediation ?? 'see advisor docs'}`,
      '',
      '```json',
      JSON.stringify(l, null, 2),
      '```',
      '',
    ].join('\n')),
    '_Fix forward via a floor-gated migration with pgTAP coverage (§12.1), then re-run the sweep. If accepted-by-design, add an allowlist rule with a reason._',
  ].join('\n');
  writeFileSync('perf-findings.md', body);
}

const summaryLines = [
  '## Supabase advisor sweep',
  '',
  `| | total | new (unallowlisted) | accepted | tracked | info |`,
  `|---|---|---|---|---|---|`,
  `| security | ${data.security.length} | **${newSecurity.length}** | ${sec.accepted.length} | ${sec.tracked.length} | ${sec.info.length} |`,
  `| performance | ${data.performance.length} | **${newPerf.length}** | ${perf.accepted.length} | ${perf.tracked.length} | ${perf.info.length} |`,
  '',
  report.tracked.length ? `Tracked findings owned by: ${[...new Set(report.tracked.map((t) => t.tracked_in))].join(', ')}` : '',
];
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summaryLines.join('\n') + '\n');
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `perf_findings=${newPerf.length > 0}\n`);
  appendFileSync(process.env.GITHUB_OUTPUT, `new_security=${newSecurity.length}\n`);
}
console.log(summaryLines.join('\n'));

if (selfTest) {
  const ok = newSecurity.length === 1 && newSecurity[0].metadata.name === 'evil_new_fn'
    && newPerf.length === 1 && newPerf[0].metadata.name === 'some_other_table'
    && sec.accepted.length === 1 && perf.tracked.length === 2
    && perf.info.length === 1;
  console.log(ok ? 'SELF-TEST PASS' : 'SELF-TEST FAIL');
  process.exit(ok ? 0 : 1);
}

if (newSecurity.length > 0) {
  console.error(`\n${newSecurity.length} new unallowlisted SECURITY finding(s) — failing per §12.1.3.`);
  process.exit(1);
}
console.log('\nadvisor sweep clean (no new unallowlisted security findings)');
