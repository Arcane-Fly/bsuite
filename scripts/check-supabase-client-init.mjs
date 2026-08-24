#!/usr/bin/env node
/**
 * check-supabase-client-init.mjs
 *
 * Hardening Phase 1.3 — Vite SPA Supabase client storage + persistSession audit.
 *
 * For each of the 5 Vite SPA apps (crm7, R80.4, braden, business-suite-unified,
 * throughput) this script:
 *   1. Locates the Supabase client init file (one of several candidate paths).
 *   2. Verifies the `createClient` auth config contains required options.
 *   3. Rejects forbidden patterns (cookie SSO relics, sessionStorage as auth store).
 *
 * Required options (per AUTH_CANONICAL.md):
 *   - flowType: 'pkce'
 *   - persistSession: true
 *   - autoRefreshToken: true
 *
 * Forbidden patterns:
 *   - storage: cookieStorage
 *   - storage: sessionStorage  (for auth — ExpoSecureStore in mobile is OK but out of scope)
 *   - storageKey: 'business_suite_auth'
 *   - domain: '.crm7.app'
 *
 * NOTE: Explicit `storage: localStorage` is acceptable but not required —
 * supabase-js defaults to localStorage in a browser context.
 *
 * The script skips apps whose directories are not checked out (submodule gitlinks)
 * so it is safe to run in a parent-repo CI context where submodules are absent.
 *
 * Exits 0 on success, 1 on any violation or missing required option.
 *
 * @see AUTH_CANONICAL.md
 * @see https://github.com/GaryOcean428/bsuite/issues (hardening 1.3)
 */

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();

/**
 * Per-app candidate file locations, in preference order.
 * The first readable path wins.
 */
const APP_CANDIDATES = [
  {
    app: 'crm7',
    candidates: [
      'crm7/src/lib/supabase.ts',
    ],
  },
  {
    app: 'R80.4',
    candidates: [
      'R80.4/src/services/supabaseClient.ts',
      'R80.4/src/lib/supabase.ts',
    ],
  },
  {
    app: 'braden',
    candidates: [
      'braden/src/integrations/supabase/client.ts',
      'braden/src/lib/supabase.ts',
    ],
  },
  {
    app: 'business-suite-unified',
    candidates: [
      'business-suite-unified/src/lib/supabase.ts',
      'business-suite-unified/src/integrations/supabase/client.ts',
    ],
  },
  {
    app: 'throughput',
    candidates: [
      'throughput/src/lib/supabase.ts',
    ],
  },
  {
    // CONDUIT WAS ABSENT FROM THIS LIST ENTIRELY until 2026-08-24 — the one app that
    // legitimately manages auth cookies, and therefore the one whose client config is
    // most worth checking.
    app: 'conduit',
    candidates: [
      'conduit/src/lib/supabase/client.ts',
      'conduit/src/lib/supabase.ts',
    ],
  },
  {
    // mobile/ is a REAL, NON-GITLINK directory in this repo, so unlike every entry above
    // it is present in every checkout — including the one build-and-test.yml makes. It was
    // declared "out of scope", and mobile/lib/supabase.ts was sitting without
    // flowType: 'pkce' while the other four apps all declare it.
    //
    // ExpoSecureStore as the storage adapter is correct for a native app and is NOT the
    // forbidden sessionStorage case; the required options are the same everywhere.
    app: 'mobile',
    candidates: [
      'mobile/lib/supabase.ts',
    ],
  },
];

/**
 * WHICH FACTORY IS THIS FILE USING? The answer changes what may be demanded of it.
 *
 * Read from the INSTALLED source, not from memory:
 *
 *   supabase-js 2.x  dist/main/lib/constants.js
 *     DEFAULT_AUTH_OPTIONS = { autoRefreshToken: true, persistSession: true,
 *                              detectSessionInUrl: true, flowType: 'implicit' }
 *     -> flowType defaults to IMPLICIT. Declaring 'pkce' explicitly is load-bearing.
 *
 *   @supabase/ssr 0.12.3  dist/main/createBrowserClient.js:40-43
 *     flowType: "pkce"                                        <- hardcoded, always
 *     autoRefreshToken: options?.auth?.autoRefreshToken ?? isBrowser()
 *     persistSession:   options?.auth?.persistSession ?? true
 *     -> all three are already correct, and a caller CANNOT get them wrong by omission.
 *
 * Demanding the literal strings of an ssr browser client is asking it to restate library
 * defaults. conduit was reported non-compliant on exactly that basis when this app was
 * first added to the list — a false finding, and the kind of over-strict guard that earns
 * its way into being switched off. The FORBIDDEN patterns still apply to both: those are
 * things a caller can actively do wrong.
 */
const SSR_BROWSER_FACTORY = /createBrowserClient\s*[<(]/;

/** Options that MUST appear in the createClient auth config block. */
const REQUIRED = [
  { label: "flowType: 'pkce'", pattern: /flowType\s*:\s*['"]pkce['"]/ },
  { label: 'persistSession: true', pattern: /persistSession\s*:\s*true/ },
  { label: 'autoRefreshToken: true', pattern: /autoRefreshToken\s*:\s*true/ },
];

/** Patterns that must NOT appear (auth config or file-wide). */
const FORBIDDEN = [
  {
    label: 'sessionStorage as auth storage',
    pattern: /storage\s*:\s*sessionStorage/,
  },
  {
    label: 'cookieStorage as auth storage',
    pattern: /storage\s*:\s*cookieStorage/,
  },
  {
    label: "storageKey: 'business_suite_auth'",
    pattern: /storageKey\s*:\s*['"]business_suite_auth['"]/,
  },
  {
    label: "domain: '.crm7.app'",
    pattern: /domain\s*[:=]\s*['"]\.crm7\.app['"]/,
  },
];

/**
 * Try to read the first accessible candidate file.
 * Returns { filePath, content } or null if none are readable.
 */
async function findClientFile(candidates) {
  for (const rel of candidates) {
    const abs = path.join(root, rel);
    try {
      await access(abs);
      const content = await readFile(abs, 'utf8');
      return { filePath: rel, content };
    } catch {
      // not found or not readable — try next candidate
    }
  }
  return null;
}

/**
 * Returns true if the line is a pure comment and should be skipped for
 * forbidden-pattern scanning. Handles `// …` and `* …` / `/* …` lines.
 * Intentionally conservative: only skips lines whose non-whitespace content
 * starts with a comment marker — this avoids truncating `//` inside string
 * literals (e.g. URLs) which would cause false negatives on required patterns.
 */
function isCommentLine(line) {
  return /^\s*(\/\/|\*|\/\*)/.test(line);
}

const results = [];
let hasViolation = false;

for (const { app, candidates } of APP_CANDIDATES) {
  const found = await findClientFile(candidates);

  if (!found) {
    // Submodule not checked out — skip gracefully.
    results.push({ app, status: 'SKIP', file: null, issues: [] });
    continue;
  }

  const { filePath, content } = found;
  const issues = [];
  const notes = [];

  // 1. Check required options are present (search whole file content).
  //
  // Skipped for an @supabase/ssr browser client: that factory HARDCODES flowType 'pkce'
  // and defaults persistSession and autoRefreshToken to true, so a caller cannot get any
  // of the three wrong by omission. See SSR_BROWSER_FACTORY above for the installed-source
  // evidence. The FORBIDDEN checks below still run — those are things a caller can
  // actively do wrong.
  const isSsrBrowserClient = SSR_BROWSER_FACTORY.test(content);
  if (isSsrBrowserClient) {
    notes.push('@supabase/ssr browser client — required options are library-guaranteed');
  } else {
    for (const { label, pattern } of REQUIRED) {
      if (!pattern.test(content)) {
        issues.push(`MISSING required option: ${label}`);
      }
    }
  }

  // 2. Check forbidden patterns are absent — skip pure comment lines to avoid
  //    false positives from documentation comments referencing old patterns.
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (isCommentLine(line)) return;
    for (const { label, pattern } of FORBIDDEN) {
      if (pattern.test(line)) {
        issues.push(`FORBIDDEN pattern at line ${idx + 1}: ${label}`);
      }
    }
  });

  // 3. Verify the file actually contains a createClient call.
  if (!/createClient\s*(?:<[^>]+>)?\s*\(/.test(content)) {
    issues.push('WARNING: createClient() call not found in this file — wrong file?');
  }

  if (issues.length > 0) hasViolation = true;
  results.push({
    app,
    status: issues.length === 0 ? 'OK' : 'FAIL',
    file: filePath,
    issues,
  });
}

// ── Output verification table ────────────────────────────────────────────────

const COL_APP = 32;
const COL_FILE = 55;
const COL_STATUS = 7;

function pad(str, len) {
  return str.length >= len ? str : str + ' '.repeat(len - str.length);
}

console.log('\nSupabase client init audit — Vite SPA hardening Phase 1.3');
console.log('='.repeat(100));
console.log(
  pad('App', COL_APP) + pad('File', COL_FILE) + 'Status',
);
console.log('-'.repeat(100));

for (const { app, status, file, issues } of results) {
  const fileCol = file ?? '(submodule not checked out — skip)';
  const statusCol = status === 'OK' ? '✅ OK' : status === 'SKIP' ? '⏭  SKIP' : '❌ FAIL';
  console.log(pad(app, COL_APP) + pad(fileCol, COL_FILE) + statusCol);
  for (const issue of issues) {
    console.log('  → ' + issue);
  }
}

console.log('='.repeat(100));

const checked = results.filter((r) => r.status !== 'SKIP');
const passed = checked.filter((r) => r.status === 'OK').length;
const skipped = results.filter((r) => r.status === 'SKIP').length;

console.log(
  `\nResult: ${passed}/${checked.length} apps passed` +
    (skipped > 0 ? ` (${skipped} skipped — submodule not checked out)` : '') +
    '\n',
);

// A SKIP IS NOT A PASS (D-92).
//
// This guard's merge-blocking gate is build-and-test.yml, whose checkout carried no
// `submodules:` key — so every candidate path resolved to nothing and it printed
//
//     Result: 0/0 apps passed (5 skipped — submodule not checked out)
//
// and exited 0 on every pull request. The guard registry's recorded evidence
// "Result: 5/5 apps passed" was measured under LANE-WATCHER, which DOES check out
// submodules — so the watcher was certifying a shape the merge-blocking gate never ran.
//
// Failing only on a ZERO denominator is not enough, and adding mobile/ (a real
// non-gitlink path) proved it: the same broken checkout then reported
// "1/1 apps passed (6 skipped)" and exited 0. One app of seven, reading as green.
//
// Every app in this list is expected to be present. A skip means the CHECKOUT is wrong,
// not that there is nothing to check.
if (skipped > 0) {
  console.error(
    `\n${skipped} of ${results.length} app(s) were SKIPPED because their submodule was not ` +
      'checked out.\n' +
      'A skip is "could not check", not "found nothing" — refusing to report a pass on the ' +
      'remainder.\n' +
      'The workflow running this needs `submodules: recursive` and a cross-repo token:\n' +
      '    token: ${{ secrets.BSUITE_CROSS_REPO_PAT || secrets.GITHUB_TOKEN }}\n',
  );
  process.exit(2);
}

if (hasViolation) {
  console.error(
    'One or more Supabase client files are non-compliant.\n' +
      'Fix the issues listed above, then re-run: node scripts/check-supabase-client-init.mjs\n' +
      'Reference: AUTH_CANONICAL.md — "Supabase client config — REQUIRED"\n',
  );
  process.exit(1);
}
