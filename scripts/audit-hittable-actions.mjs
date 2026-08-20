#!/usr/bin/env node
/**
 * audit-hittable-actions.mjs — a page's PRIMARY ACTION must actually be
 * clickable by a person.
 *
 * WHY THIS EXISTS
 *
 * On 2026-08-20 the operator sent a screenshot of crm7's Add Client page. On it,
 * at 1366x768:
 *
 *   - the card holding Create/Cancel was 32px tall around a 36px button, with
 *     `overflow-hidden`, so the button was clipped;
 *   - a neighbouring card's helper text, and later the PWA install prompt, were
 *     painted over what remained. `document.elementFromPoint` at the button's
 *     centre returned a `<p>`, not the button.
 *
 * A person could not submit the form. Every existing gate passed:
 *
 *   audit-applied-tokens   colours and pure endpoints — the button was correctly
 *                          coloured, and correctly coloured underneath something
 *   audit-legibility       contrast — of text that was not the problem
 *   audit-ui-pages         DOM presence — the button WAS in the DOM
 *   e2e                    it "created a client" — Playwright scrolls an element
 *                          into view and forces the click, so it reaches a button
 *                          a human cannot. AN AUTOMATED CLICK IS NOT EVIDENCE
 *                          THAT A HUMAN CAN CLICK.
 *
 * Every one of those asks whether the button EXISTS or how it LOOKS. None asks
 * the only question that decides whether the page works: if a person clicks the
 * middle of it, do they hit it?
 *
 * WHAT THIS CHECKS
 *
 * For each route, find the page's primary action — a submit button, or the
 * last/most prominent action-looking control — and assert that
 * `document.elementFromPoint` at its centre returns that element (or a
 * descendant). Anything else means something is painted on top.
 *
 * It also reports a control CLIPPED by an ancestor with `overflow: hidden`,
 * because a half-visible button is a defect even when its centre happens to be
 * hittable.
 *
 * DELIBERATE LIMITS, stated rather than discovered later:
 *   - A route with no action control is SKIPPED, not passed. Most list pages
 *     have none, and inventing one would make the check meaningless.
 *   - It tests the CENTRE point only. A button whose centre is clear but whose
 *     edges are covered still passes; catching that needs a grid sample, which
 *     costs more than it is worth on every route.
 *   - It runs at one viewport per invocation (--viewport, default 1366x768 —
 *     the size the reported defect appeared at, and the most common laptop).
 */
/**
 * G5 + G6 — prove the tokens reach the DOM.
 *
 * WHY A BROWSER AND NOT A GREP
 * Every static gate in this suite can be satisfied by a token that nothing
 * consumes. Three times now that gap has produced a defect an operator saw and
 * no script did:
 *
 *   · --role-h1..h6 were added and NOTHING bound them to an h1..h6. Grepping
 *     for "--role-h" showed the ramp correctly wired while every heading on
 *     screen was one flat colour.
 *   · Then the binding was added — and R80.4's own @layer base, later in the
 *     same layer, set `h1,h2,h3,h4,h5,h6 { color: var(--text-heading) }` and
 *     won the cascade. The ramp was present, bound, and still defeated.
 *   · --font-* was specified in the contract and never shipped, so five apps
 *     ran four different families while every file looked fine.
 *
 * The common shape: the source is correct and the computed style is not. Only
 * a real layout engine can tell you which one you shipped.
 *
 * WHAT IT ASSERTS (per app, light and dark)
 *   G5  h1..h6 resolve to SIX DISTINCT colours    (the ramp survives the cascade)
 *   G6  body font-family resolves to the contract family, and is actually loaded
 *   P1  no element computes to pure white or pure black in a colour role
 *   P7  no text is invisible: colour != its own background
 *
 * Usage: node scripts/audit-applied-tokens.mjs <url> [<url> ...] [--app <name>]
 *        [--json] [--storage <storageState.json>]
 * Requires a running dev server or a preview URL.
 *
 * SIGNED-IN RUNS
 * Most routes in this estate are behind auth, and an unauthenticated hit
 * redirects to the OAuth server — which rejects a localhost redirect_uri, so it
 * lands off-origin and is SKIPPED rather than audited. To cover them, sign in
 * once with playwright, save context.storageState() to a path OUTSIDE the repo,
 * and pass it with --storage. That file holds live tokens: never commit it.
 *
 * Note which OAuth server the target uses. d.r8.crm7.app accepts a
 * d.suite.crm7.app session; crm7's preview build redirects to PRODUCTION
 * suite.crm7.app, so a dev session is not enough there.
 */
// The parent repo has no node_modules of its own — every app installs into its
// own submodule, and pnpm does not hoist a transitive playwright to a place a
// bare `import 'playwright'` can see. A gate that only runs where the package
// happens to be hoisted is a gate that quietly never runs, so resolve it: the
// app installs first (CI and local both have one), then the pnpm store.
import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
const require_ = createRequire(import.meta.url);

function resolvePlaywright() {
  const roots = ['..', '../braden', '../conduit', '../throughput', '../crm7',
                 '../business-suite-unified', '../R80.4'];
  for (const r of roots) {
    try { return require_(new URL(`${r}/node_modules/playwright/index.js`, import.meta.url).pathname); } catch {}
  }
  for (const r of roots) {
    try {
      const base = new URL(`${r}/node_modules/.pnpm/`, import.meta.url).pathname;
      const hit = readdirSync(base).find((d) => d.startsWith('playwright@'));
      if (hit) return require_(`${base}${hit}/node_modules/playwright/index.js`);
    } catch {}
  }
  console.error('playwright not found — install it in any app, or `pnpm add -D playwright`');
  process.exit(2);
}
const { chromium } = resolvePlaywright();

const appIdx = process.argv.indexOf('--app');
const app = appIdx > -1 ? process.argv[appIdx + 1] : 'unknown';
const asJson = process.argv.includes('--json');
// --storage <playwright storageState.json> runs the sweep SIGNED IN. Without it
// every authenticated route redirects to the OAuth server, lands off-origin and
// is skipped — which is most of these apps. The file holds real tokens: keep it
// outside the repo and never commit it.
const stIdx = process.argv.indexOf('--storage');
const storageState = stIdx > -1 ? process.argv[stIdx + 1] : undefined;
// Every non-flag argument is a URL. Launching a fresh Chromium per route is what
// made the first version of the sweep unusable: 12 routes meant 12 browser
// starts, and the run had not finished after fifteen minutes. One browser,
// reused across routes, is the whole difference.
const urls = [];
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--app' || a === '--storage') { i++; continue; }   // skip the flag AND its value
  if (a.startsWith('--')) continue;
  urls.push(a);
}

// `--self-test` takes no URLs, so it must be exempt from this guard — the first
// version was not, and the self-test exited 2 with a usage message instead of
// running. A self-test that cannot be invoked is the same as not having one.
if (!urls.length && !process.argv.includes('--self-test')) {
  console.error('usage: audit-hittable-actions.mjs <url> [<url> ...] [--app <name>] [--storage <state>]');
  console.error('       audit-hittable-actions.mjs --self-test');
  process.exit(2);
}

const vpIdx = process.argv.indexOf('--viewport');
const [VW, VH] = (vpIdx > -1 ? process.argv[vpIdx + 1] : '1366x768').split('x').map(Number);

/**
 * Finds the control a person would press to complete the page's purpose.
 *
 * Deliberately conservative: a submit button, or a button whose label reads like
 * a commit action. If nothing matches we SKIP rather than guess — a wrong guess
 * would either fail a page that is fine or, worse, pass one that is not, because
 * it measured the wrong control.
 */
const FIND_PRIMARY = () => {
  const root = document.querySelector('main main') || document.querySelector('main') || document.body;
  const COMMIT = /^(create|save|submit|add|update|send|confirm|apply|generate|invite|publish)\b/i;
  const controls = [...root.querySelectorAll('button, input[type=submit], [role=button]')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.hasAttribute('disabled')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  /*
   * LABEL FIRST, then a real form submit. The order matters and the first
   * version had it backwards.
   *
   * `el.type === 'submit'` is TRUE FOR ANY BARE <button> — that is the HTML
   * default when no type attribute is given. Checking it first made this pick
   * the theme toggle on crm7's home page and call it the primary action. An
   * auditor that measures the wrong control is worse than none: it reports a
   * confident pass about a button nobody cares about.
   *
   * A commit-sounding LABEL is the reliable signal. A submit button is only
   * trusted when it is explicitly typed AND inside a form.
   */
  const byLabel = controls.filter((el) => COMMIT.test((el.textContent || '').trim()));
  const realSubmit = controls.find(
    (el) =>
      (el.getAttribute('type') === 'submit' || el.tagName === 'INPUT') &&
      el.closest('form') !== null,
  );
  const target = byLabel[byLabel.length - 1] || realSubmit || null;
  if (!target) return { found: false };

  target.scrollIntoView({ block: 'center', behavior: 'instant' });
  const r = target.getBoundingClientRect();
  const label = (target.textContent || target.value || '').trim().slice(0, 40);

  /*
   * Is the CONTROL ITSELF cut off? A half-visible button is a defect even when
   * its centre happens to be hittable.
   *
   * THE FIRST VERSION REPORTED THE WRONG THING, and it did so on the first real
   * run. It walked up to the nearest `overflow: hidden` ancestor whose content
   * exceeded its box and called the button clipped. On BSU's login page that
   * ancestor was the PAGE SHELL — 860px of content in a 768px box — while the
   * "Create Account" button sat comfortably at y=531, fully visible and
   * genuinely clickable. The page was losing 92px; the button was not clipped at
   * all.
   *
   * A gate that misnames what it found is only marginally better than one that
   * finds nothing: the first person to check it sees a visible, working button
   * and learns to distrust the gate.
   *
   * So: the control is CLIPPED only when its own rectangle extends past the
   * clipper's visible box. An ancestor that clips content ELSEWHERE on the page
   * is reported separately, as `pageClips`, because it is a real defect — unless
   * something between it and the control scrolls, in which case the overflow is
   * reachable and there is nothing to report.
   */
  let clipped = null;
  let pageClips = null;
  for (let e = target.parentElement; e; e = e.parentElement) {
    const cs = getComputedStyle(e);
    const scrolls = /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2;
    // A scrollable ancestor absorbs the overflow: anything above it is reachable.
    if (scrolls) break;
    const hides = (cs.overflowY === 'hidden' || cs.overflow === 'hidden') && e.scrollHeight > e.clientHeight + 2;
    if (!hides) continue;

    const box = e.getBoundingClientRect();
    const cut = r.bottom > box.bottom + 1 || r.top < box.top - 1;
    if (cut) {
      clipped = { lostPx: Math.round(Math.max(r.bottom - box.bottom, box.top - r.top)), boxH: e.clientHeight, contentH: e.scrollHeight };
      break;
    }
    /*
     * OVERFLOW IS NOT LOSS UNLESS SOMETHING REAL IS IN IT.
     *
     * Caught on the first run, on BSU's login page: this reported 92px of the
     * page as unreachable. Nothing was down there. The shell is
     * `flex min-h-svh items-center justify-center overflow-hidden` — a CENTRING
     * container whose `overflow-hidden` exists precisely to clip a decorative
     * background that extends past the fold. `scrollHeight` exceeded
     * `clientHeight` because of the decoration, not because content was lost.
     *
     * A gate that cries wolf on the sign-in page is worse than no gate: the
     * first person to look sees a page that is obviously fine and stops
     * believing the next finding, which might be real.
     *
     * So the region is only LOST if it contains something a person would need —
     * an interactive control, or a leaf element carrying text.
     */
    if (!pageClips) {
      const box = e.getBoundingClientRect();
      const realContentBelow = [...e.querySelectorAll('a,button,input,select,textarea,[role=button],p,h1,h2,h3,li,td,label,span')]
        .some((n) => {
          const nr = n.getBoundingClientRect();
          if (nr.top < box.bottom - 2 || nr.height < 4) return false;
          const interactive = /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(n.tagName) || n.getAttribute('role') === 'button';
          return interactive || ((n.textContent || '').trim().length > 0 && n.children.length === 0);
        });
      if (realContentBelow) {
        pageClips = { lostPx: e.scrollHeight - e.clientHeight, boxH: e.clientHeight, contentH: e.scrollHeight,
                      where: `${e.tagName}${e.className ? '.' + String(e.className).slice(0, 30) : ''}` };
      }
    }
  }

  const inViewport = r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
  if (!inViewport) return { found: true, label, inViewport: false, clipped, pageClips };

  const cx = Math.round(r.left + r.width / 2);
  const cy = Math.round(r.top + r.height / 2);
  const hit = document.elementFromPoint(cx, cy);
  const hittable = hit === target || target.contains(hit);
  return {
    found: true,
    label,
    inViewport: true,
    hittable,
    clipped,
    pageClips,
    coveredBy: hittable ? null : `${hit?.tagName}${hit?.className ? '.' + String(hit.className).slice(0, 30) : ''}`,
    coveredByText: hittable ? null : (hit?.textContent || '').trim().slice(0, 40),
  };
};

/*
 * SELF-TEST — a gate whose pass and no-op states are indistinguishable hides
 * defects, so prove the detector can still fail before trusting a pass.
 *
 * The three fixtures are the three real shapes, written from the defect the
 * operator reported on 2026-08-20:
 *   covered   an overlay painted over the button (the PWA install prompt)
 *   clipped   an overflow-hidden ancestor shorter than the button (the card)
 *   clean     neither
 */
if (process.argv.includes('--self-test')) {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');

  const dir = mkdtempSync(join(tmpdir(), 'hittable-'));
  const FIXTURES = {
    covered: `<!doctype html><meta charset=utf-8><style>body{margin:0}main{padding:40px}
      .overlay{position:fixed;bottom:24px;right:24px;width:340px;padding:16px;background:#eee}</style>
      <main><main><form><input placeholder=name>
      <div style="position:fixed;bottom:40px;right:80px"><button type=button>Create Client</button></div>
      </form></main></main><div class=overlay><p>Install BSuite CRM</p></div>`,
    clipped: `<!doctype html><meta charset=utf-8><style>body{margin:0}main{padding:40px}
      .card{height:30px;overflow:hidden}</style>
      <main><main><form><input placeholder=name>
      <div class=card><button type=button style="height:36px">Create Client</button></div>
      </form></main></main>`,
    clean: `<!doctype html><meta charset=utf-8><style>body{margin:0}main{padding:40px}</style>
      <main><main><form><input placeholder=name>
      <button type=button style="height:36px">Create Client</button></form></main></main>`,
    noAction: `<!doctype html><meta charset=utf-8><main><main><p>A list page.</p>
      <button type=button>Toggle theme</button></main></main>`,
    // A CENTRING shell whose overflow-hidden clips DECORATION, not content —
    // BSU's login page. The button sits comfortably inside; the only thing past
    // the fold is a background blob. Reporting this is a false positive, and a
    // gate that cries wolf on the sign-in page stops being believed.
    decorativeOverflow: `<!doctype html><meta charset=utf-8><style>body{margin:0}
      .shell{position:relative;display:flex;min-height:100vh;align-items:center;justify-content:center;overflow:hidden}
      .blob{position:absolute;top:100vh;height:200px;width:400px;background:#333}</style>
      <div class=shell><span class=blob></span><main><main><form><input placeholder=name>
      <button type=button style="height:36px">Create Account</button></form></main></main></div>`,
  };
  for (const [name, html] of Object.entries(FIXTURES)) writeFileSync(join(dir, `${name}.html`), html);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  const pg = await ctx.newPage();
  const verdict = async (name) => {
    await pg.goto(`file://${join(dir, `${name}.html`)}`);
    await pg.waitForTimeout(120);
    const r = await pg.evaluate(FIND_PRIMARY);
    if (!r.found) return 'skip';
    if (r.clipped) return 'clipped';
    if (r.inViewport === false) return 'skip';
    if (r.pageClips) return 'pageClips';
    return r.hittable ? 'ok' : 'covered';
  };

  const cases = [
    ['an overlay over the button is CAUGHT', 'covered', 'covered'],
    ['an overflow-hidden ancestor shorter than the button is CAUGHT', 'clipped', 'clipped'],
    ['a clean button passes', 'clean', 'ok'],
    ['a page with no commit action is SKIPPED, not measured', 'noAction', 'skip'],
    ['DECORATIVE overflow behind a centring shell is NOT reported as lost content', 'decorativeOverflow', 'ok'],
  ];
  let bad = 0;
  for (const [label, fixture, expected] of cases) {
    const got = await verdict(fixture);
    const pass = got === expected;
    if (!pass) bad++;
    console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${label}${pass ? '' : ` (expected ${expected}, got ${got})`}`);
  }
  await b.close();
  rmSync(dir, { recursive: true, force: true });
  console.log(
    bad === 0
      ? `audit-hittable-actions --self-test: OK — ${cases.length} cases pass`
      : `audit-hittable-actions --self-test: FAILED — ${bad} of ${cases.length}`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: VW, height: VH }, storageState });
const page = await context.newPage();

let failures = 0;
let skipped = 0;
let checked = 0;
let notApplicable = 0;

for (const url of urls) {
  let res;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    // Give a card grid time to settle. Its asynchronous reflow is what moved
    // things on top of the button in the reported defect, so measuring before it
    // settles would report a page that is fine a moment later.
    await page.waitForTimeout(2500);
    if (new URL(page.url()).origin !== new URL(url).origin) {
      console.log(`  SKIPPED ${url} — redirected off-origin (not signed in?)`);
      skipped++;
      continue;
    }
    res = await page.evaluate(FIND_PRIMARY);
  } catch (err) {
    console.log(`  SKIPPED ${url} — ${String(err.message).slice(0, 70)}`);
    skipped++;
    continue;
  }

  if (!res.found) {
    /*
     * NOT APPLICABLE is not the same as NOT MEASURED, and the word matters
     * because the sweep harness counts "SKIPPED" as non-coverage and fails on
     * it — correctly, under the rule that an unevaluable class is UNKNOWN and
     * UNKNOWN blocks.
     *
     * A list page genuinely has no primary action to press. That is a FACT
     * ABOUT THE PAGE, established by looking, not a failure to look. Calling it
     * SKIPPED made every list route in the sweep read as unaudited coverage and
     * failed the job for pages that are fine.
     *
     * The genuinely unevaluable cases below — redirected off-origin, could not
     * be brought into the viewport — keep the word SKIPPED, because those ARE
     * measurements that did not happen.
     */
    console.log(`  n/a ${url} — no primary action control on this page`);
    notApplicable++;
    continue;
  }

  if (res.clipped) {
    failures++;
    checked++;
    console.log(
      `  ✗ ${url} — "${res.label}" is CLIPPED: its own box extends ${res.clipped.lostPx}px past an ` +
        `overflow-hidden ancestor (${res.clipped.boxH}px box around ${res.clipped.contentH}px of content)`,
    );
    continue;
  }
  /*
   * The control is fine, but something above it hides content with no scroll
   * anywhere in between — that content is unreachable by any means. Reported and
   * FAILED, because unreachable page content is a defect even when the primary
   * action happens to sit above the cut.
   */
  if (res.pageClips) {
    failures++;
    checked++;
    console.log(
      `  ✗ ${url} — "${res.label}" is reachable, but ${res.pageClips.lostPx}px of the page below it is NOT: ` +
        `${res.pageClips.where} holds ${res.pageClips.contentH}px in a ${res.pageClips.boxH}px overflow-hidden box ` +
        `and nothing between it and the control scrolls`,
    );
    continue;
  }
  if (res.inViewport === false) {
    console.log(`  SKIPPED ${url} — "${res.label}" could not be brought into the viewport`);
    skipped++;
    continue;
  }
  checked++;
  if (!res.hittable) {
    failures++;
    console.log(
      `  ✗ ${url} — "${res.label}" is NOT hittable: a click at its centre lands on ` +
        `${res.coveredBy}${res.coveredByText ? ` ("${res.coveredByText}")` : ''}`,
    );
    continue;
  }
  console.log(`  ok ${url} — "${res.label}" is hittable`);
}

await browser.close();
console.log(
  `audit-hittable-actions: ${checked} action(s) checked, ${failures} unhittable, ` +
    `${notApplicable} page(s) with no action, ${skipped} skipped (${VW}x${VH})`,
);
process.exit(failures > 0 ? 1 : 0);
