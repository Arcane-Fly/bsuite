#!/usr/bin/env node
/**
 * check-speed-insights-route.mjs
 *
 * Every app that mounts <SpeedInsights /> from `@vercel/speed-insights/react`
 * must pass a `route` prop.
 *
 * ---------------------------------------------------------------------------
 * WHY
 * ---------------------------------------------------------------------------
 * Operator, 2026-08-29: "paths appear to be measured but not routes" and "the
 * app itself feels slow even though it has a good score."
 *
 * Both are the same defect. The library's own type declares
 * `route?: string | null`. Omit it and every datapoint falls back to
 * `window.location.pathname`, so `/apprentices/<uuid-a>` and
 * `/apprentices/<uuid-b>` are separate rows. One page's Core Web Vitals split
 * across hundreds of record-id buckets, each too small to reach the p75
 * Vercel scores on.
 *
 * The busy pages then drop OUT of the report for want of samples, and the
 * score that survives is computed over the static paths that had enough. That
 * is how a slow app scores well — and why nobody could see it from the
 * dashboard.
 *
 * Five of six apps were in that state on 2026-08-29. It is silent: nothing
 * warns, the component renders, and the dashboard fills with plausible
 * numbers.
 *
 * ---------------------------------------------------------------------------
 * NOT WIRED TO CI YET, DELIBERATELY
 * ---------------------------------------------------------------------------
 * It currently FAILS: five apps mount the react entrypoint with no route, and
 * the fix needs @bsuite/nav-core 1.2.0 published before they can consume
 * useSpeedInsightsRoute(). Wiring a gate that is red on the day it lands
 * teaches everyone to ignore it, and this estate has three such gates already.
 * The workflow step lands in the same change as the app fix, green.
 *
 * ---------------------------------------------------------------------------
 * SCOPE
 * ---------------------------------------------------------------------------
 * Only the `/react` entrypoint. `@vercel/speed-insights/next` reads the route
 * pattern from the Next router and must NOT pass `route` — conduit uses that
 * one and is correct as-is. A gate that demanded the prop everywhere would be
 * wrong about conduit and would be "fixed" by breaking it.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const APPS = ['crm7', 'business-suite-unified', 'conduit', 'braden', 'throughput', 'R80.4'];
const SKIP = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '__tests__']);

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (SKIP.has(e)) continue;
    const p = join(dir, e);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (/\.(tsx|jsx)$/.test(e) && !e.includes('.test.')) out.push(p);
  }
  return out;
}

/** The JSX element text for <SpeedInsights …>, across line breaks. */
function findMounts(text) {
  const out = [];
  const re = /<SpeedInsights\b[\s\S]{0,400}?\/>/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[0]);
  return out;
}

export function auditText(text) {
  const usesReact = /@vercel\/speed-insights\/react/.test(text);
  const usesNext = /@vercel\/speed-insights\/next/.test(text);
  if (!usesReact && !usesNext) return null;
  const mounts = findMounts(text);
  if (mounts.length === 0) return null;
  // The /next entrypoint derives the route itself; requiring the prop there
  // would be wrong.
  if (usesNext && !usesReact) return { entrypoint: 'next', mounts: mounts.length, missing: 0 };
  const missing = mounts.filter((m) => !/\broute\s*=/.test(m)).length;
  return { entrypoint: 'react', mounts: mounts.length, missing };
}

if (process.argv.includes('--self-test')) {
  const cases = [
    ['react mount with no route — the 2026-08-29 defect',
      `import { SpeedInsights } from '@vercel/speed-insights/react'\n<SpeedInsights />`, 1],
    ['react mount WITH route',
      `import { SpeedInsights } from '@vercel/speed-insights/react'\n<SpeedInsights route={r} />`, 0],
    ['route on a following line still counts',
      `import { SpeedInsights } from '@vercel/speed-insights/react'\n<SpeedInsights\n  route={r}\n/>`, 0],
    ['next entrypoint needs no route and must not be flagged',
      `import { SpeedInsights } from '@vercel/speed-insights/next'\n<SpeedInsights />`, 0],
    ['a file that merely mentions the package in prose is not a mount',
      `// we use @vercel/speed-insights/react somewhere`, 0],
    ['two react mounts, one missing',
      `import { SpeedInsights } from '@vercel/speed-insights/react'\n<SpeedInsights route={a} />\n<SpeedInsights />`, 1],
  ];
  let pass = 0;
  for (const [why, src, want] of cases) {
    const got = auditText(src)?.missing ?? 0;
    if (got === want) pass++;
    else console.error(`FAIL self-test: ${why} — wanted ${want}, got ${got}`);
  }
  const firing = cases.filter((c) => c[2] > 0).length;
  console.log(`check-speed-insights-route self-test: ${pass}/${cases.length} pass (${firing} assert the gate FIRES)`);
  process.exit(pass === cases.length ? 0 : 1);
}

const present = APPS.filter((a) => existsSync(join(ROOT, a, 'src')) || existsSync(join(ROOT, a, 'app')));
if (present.length === 0) {
  console.error('REFUSING TO RUN: no app source tree found — submodules are probably not checked out.');
  console.error('Every app would read as having no mount, and this gate would report a confident pass.');
  process.exit(2);
}

let mounts = 0;
const offenders = [];
for (const app of present) {
  for (const base of ['src', 'app']) {
    const dir = join(ROOT, app, base);
    if (!existsSync(dir)) continue;
    for (const file of walk(dir)) {
      let text;
      try { text = readFileSync(file, 'utf8'); } catch { continue; }
      const r = auditText(text);
      if (!r) continue;
      mounts += r.mounts;
      if (r.missing > 0) offenders.push({ file: file.replace(`${ROOT}/`, ''), ...r });
    }
  }
}

for (const o of offenders) {
  console.log(`  MISSING route  ${o.file}  (${o.missing} of ${o.mounts} mount(s))`);
}
console.log(`\n  ${present.length} app(s) scanned, ${mounts} <SpeedInsights /> mount(s) found`);
console.log(`  ${offenders.length} file(s) mounting the react entrypoint without a route prop`);

if (mounts === 0) {
  console.error('\nREFUSING: found no mounts at all. Either every app dropped Speed Insights,');
  console.error('or this gate stopped matching — and those look identical from a pass.');
  process.exit(2);
}
if (offenders.length) {
  console.error('\nWithout `route`, every datapoint falls back to window.location.pathname and one');
  console.error('page splits across hundreds of record-id rows — too few samples each to be scored.');
  console.error('Pass useSpeedInsightsRoute() from @bsuite/nav-core.');
  process.exit(1);
}
console.log('  check-speed-insights-route: OK');
