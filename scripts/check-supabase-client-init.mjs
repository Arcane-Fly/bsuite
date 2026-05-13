#!/usr/bin/env node
/**
 * check-supabase-client-init.mjs
 *
 * Hardening Phase 1.3 — Vite SPA Supabase client storage + persistSession audit.
 *
 * For each of the 5 Vite SPA apps (crm7, R80.3, braden, business-suite-unified,
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
    app: 'R80.3',
    candidates: [
      'R80.3/src/services/supabaseClient.ts',
      'R80.3/src/lib/supabase.ts',
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
];

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

  // 1. Check required options are present (search whole file content).
  for (const { label, pattern } of REQUIRED) {
    if (!pattern.test(content)) {
      issues.push(`MISSING required option: ${label}`);
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
  if (!/createClient\s*\(/.test(content)) {
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

if (hasViolation) {
  console.error(
    'One or more Supabase client files are non-compliant.\n' +
      'Fix the issues listed above, then re-run: node scripts/check-supabase-client-init.mjs\n' +
      'Reference: AUTH_CANONICAL.md — "Supabase client config — REQUIRED"\n',
  );
  process.exit(1);
}
