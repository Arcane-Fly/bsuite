#!/usr/bin/env node
/**
 * drift-scan.mjs — Canonical BSuite pre-merge drift scanner.
 *
 * ─── No-Regex-by-Default Exception (knowledge.md §Code) ─────────────────────
 * This file is lint-tooling for source-code patterns (not structured-data
 * parsing). Per the same precedent as scripts/check-no-cookie-sso.mjs,
 * scripts/check-tailwind-v4.mjs, and scripts/check-node-pin-parity.mjs, it
 * uses regex ONLY where word-boundary, quote-variant, or whitespace-flexible
 * matching is required. All purely-literal checks use String.prototype.includes.
 *
 * Discipline:
 *  • Every regex is ≤ 80 chars and has no nested unbounded quantifiers (ReDoS-safe).
 *  • Every regex has an inline comment explaining why regex was needed over .includes().
 *  • `--regex-audit` self-check enforces these limits on future edits.
 *
 * ─── Usage ──────────────────────────────────────────────────────────────────
 *   node scripts/drift-scan.mjs                           PR-diff vs origin/main merge-base
 *   node scripts/drift-scan.mjs --base <sha> --head <sha> explicit range (CI)
 *   node scripts/drift-scan.mjs --full                    scan the full working tree
 *   node scripts/drift-scan.mjs --json                    emit JSON to stdout
 *   node scripts/drift-scan.mjs --self-test               run built-in fixtures
 *   node scripts/drift-scan.mjs --regex-audit             audit every regex literal in SIGNALS
 *
 * Exit codes:
 *   0 — no drift or warn-soft only
 *   1 — one or more hard-fail signals found
 *   2 — scanner error
 *
 * Canonical authority: bsuite#902
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const ARGS = parseArgs(process.argv.slice(2));

// ─── Small, documented regex primitives (each ≤ 80 chars, ReDoS-safe) ─────

// Word-boundary bare token (needed to avoid matching "noncookieStorage" or similar).
const WORD_COOKIE_STORAGE = /\bcookieStorage\b/;
const WORD_CREATE_COOKIE_STORAGE = /\bcreateCookieStorage\b/;
// Quote-variant: `domain: '.crm7.app'` OR `domain: ".crm7.app"` OR `domain='...'`.
const DOMAIN_CRM7_APP = /domain\s*[:=]\s*["']\.crm7\.app["']/;
// storageKey variant: single or double quotes, optional whitespace around colon.
const STORAGE_KEY_LEGACY = /storageKey\s*:\s*["']business_suite_auth["']/;
// Quote-variant + whitespace-flex for `flowType: 'pkce'` family.
const FLOWTYPE_IMPLICIT = /flowType\s*:\s*["']implicit["']/;
const RESPONSE_TYPE_TOKEN = /response_type\s*[=:]\s*["']?token\b/;
// Hex color detector — only invoked AFTER a color-context literal match.
// Character class `[0-9a-fA-F]` cannot match greedily past length limit; safe.
const HEX_COLOR_NARROW = /#([0-9a-fA-F]{3,8})\b/;
// `as any` with flexible whitespace; word-boundary prevents "classname".
const AS_ANY = /\bas\s+any\b/;
// engines.node JSON value: quote-variant + whitespace-flex.
const ENGINES_NODE_VALUE = /"node"\s*:\s*"([^"]+)"/;
// (Tailwind v3 utility checks use .includes() — no regex needed; the literal
// `flex-shrink-0` / `flex-grow-0` is unambiguous because `-0` is the terminator
// and Tailwind utilities extending with `-` would come BEFORE, not after.)
// Test-path fragments and file suffixes — hoisted to module scope (hot path).
// Used only by NEW-HEX-IN-D2C; other signals intentionally still fire on test files.
const TEST_PATH_FRAGMENTS = ['__tests__/', '/tests/', '/e2e/', '/cypress/', '/playwright/'];
const TEST_FILE_SUFFIXES = [
  '.test.ts', '.test.tsx', '.test.js', '.test.jsx',
  '.spec.ts', '.spec.tsx', '.spec.js', '.spec.jsx',
  '.stories.ts', '.stories.tsx', '.stories.js', '.stories.jsx',
];
const CODE_FILE_SUFFIXES = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
// Deliberate-exception marker, shared verbatim with `scripts/audit-d2c-theme.sh`
// (its `AUDIT_OK`). Two gates gating the same rule MUST honour the same opt-out,
// or the annotation silences one and the other still blocks the merge — which is
// exactly what happened on crm7#1724: `vite.config.ts` carries
//   theme_color: '#2563eb', // theme-audit-ok: webmanifest needs literal hex
// A PWA webmanifest cannot express oklch(); `theme_color`/`background_color` are
// required by spec to be literal CSS colours the browser parses before any
// stylesheet exists. The theme audit accepted that annotation, this scanner did
// not, and the disagreement read as a code defect when the code was right.
//
// Semantics are copied from that awk one-liner exactly — `index($0,ok) ||
// index(prev,ok)` — i.e. a plain substring on the flagged line OR on the line
// immediately above it, the eslint-disable-next-line convention. Deliberately
// NOT restricted to comment syntax: any stricter test would re-open the same
// disagreement from the other side, letting the shell audit pass a line this
// scanner still fails.
const AUDIT_OK_MARKER = 'theme-audit-ok';
// JS regex literals can start after these expression-leading punctuators.
const COOKIE_SSO_REGEX_PREFIX_CHARS = '([{:;,!=?&|+-*%^~<>';
const ROOT_REQUIRE = createRequire(import.meta.url);
// Workspace fallback: drift-scan lives at repo root, but the parser is currently
// declared from packages/dry-lint rather than the root package.json.
const DRY_LINT_REQUIRE = createRequire(new URL('../packages/dry-lint/package.json', import.meta.url));
const COOKIE_SSO_PARSER_CANDIDATES = [ROOT_REQUIRE, DRY_LINT_REQUIRE];
let cookieSsoParser = null;

// Self-scan exclusions — lint-tooling files whose source necessarily contains
// literal strings that match drift signals (regex sources, test fixtures,
// detector patterns). Excluding them prevents the self-scan paradox where
// the scanner hard-fails on its own rollout PR, as well as on edits to the
// sibling check-*.mjs lint scripts (which also contain drift literals by
// necessity — e.g. check-no-cookie-sso.mjs must contain the token it detects).
function isSelfScanExcluded(file) {
  if (file === 'scripts/drift-scan.mjs') return true;
  if (file === '.github/workflows/pr-drift-scan.yml') return true;
  // Sibling lint scripts: scripts/check-<something>.mjs
  if (file.startsWith('scripts/check-') && file.endsWith('.mjs')) return true;
  // Auto-generated dashboard surfaces — JSON content legitimately mentions
  // banned tokens as remediation/audit text (e.g., "ensure cookieStorage = 0 hits").
  if (file === 'docs/dashboard/index.html') return true;
  if (file.startsWith('docs/dashboard/data/')) return true;
  // Investigation records QUOTE the forbidden pattern as the evidence of the
  // violation they investigated — the same "mentions a banned token as audit
  // text" case as the dashboard surfaces above. This doc's four hits are all
  // pasted `src/lib/supabase/*.ts` excerpts from the 2026-04-27 conduit auth
  // audit, i.e. a record of a breach that was then FIXED. Failing on it asks
  // for the evidence to be deleted, which is how a finding quietly stops being
  // discoverable.
  //
  // Named explicitly rather than glob-excluding docs/: a document that
  // INSTRUCTS someone to use cookieStorage is real drift and must still fail.
  if (file === 'docs/20260427-conduit-auth-doctrine-investigation-v1.00W.md') return true;
  // docs/recovered/ is a FROZEN ARCHIVE of superseded requirements documents,
  // dated 2026-02 to 2026-03 and tracked (2026-08-08) under operator RULINGs 1.2
  // and 1.3. Its contents are historical by declaration: every file is covered by
  // docs/recovered/00-READ-THIS-FIRST-corpus-health.md, which states the corpus is
  // UNTRUSTED until each document is verdicted against code (bsuite#1830).
  //
  // These documents necessarily name what was true when they were written —
  // grok-4.1-fast-reasoning, the pre-2025-02-27 cookie-SSO pattern, Tailwind v3
  // utilities. "Correcting" them would rewrite the record of what was decided and
  // when, which is the same harm as deleting the conduit investigation above, and
  // it is precisely what the R80.3 -> R80.4 sweep on this same PR deliberately did
  // NOT do to the archived migration-scope entries.
  //
  // The boundary is unchanged from the note above: this is scoped to the archive
  // directory ONLY. A LIVE doc anywhere else that instructs someone to use a
  // retired model or a removed auth pattern is real drift and must still hard-fail.
  // If material leaves this directory to become live guidance, it loses the
  // exemption with it.
  if (file.startsWith('docs/recovered/')) return true;
  return false;
}

// Color CSS properties — literal gate list (no regex). Used with .includes().
const COLOR_PROP_GATES = [
  'color:', 'color =',
  'background:', 'backgroundColor:', 'background-color:',
  'fill:', 'stroke:',
  'borderColor:', 'border-color:',
  'borderTopColor:', 'border-top-color:',
  'borderBottomColor:', 'border-bottom-color:',
];

// ─── Signal definitions ───────────────────────────────────────────────────

const SIGNALS = [
  {
    id: 'COOKIE-SSO',
    severity: 'fail',
    rule: 'Cookie SSO removed suite-wide 2025-02-27 — use per-domain localStorage + PKCE',
    skill: 'auth-setup + AUTH_CANONICAL.md',
    match: (line, file, fw) => {
      // Next.js server files legitimately use @supabase/ssr cookies.
      if (fw === 'nextjs') {
        if (file.endsWith('middleware.ts') || file.endsWith('route.ts')
            || file.endsWith('actions.ts') || file.includes('/api/')
            || file.includes('/server/') || file.includes('/auth/')) return null;
      }
      return null;
    },
  },
  {
    id: 'STALE-GROK',
    severity: 'fail',
    rule: 'Default xAI model is grok-4.3 — grok-4.1-fast-reasoning retired 2026-04-24',
    skill: 'vercel-ai-sdk + crm7/src/lib/ai/config.ts',
    match: (line) => {
      // Pure literal check — .includes() suffices.
      //
      // Only grok-4.1-fast-REASONING is retired and hard-failed. Deliberately
      // NOT flagging grok-4.20-*: those models still exist on the gateway, they
      // simply stopped being our default when grok-4.3 landed (2026-07-31).
      // Hard-failing a live model would block legitimate use. And
      // grok-4.1-fast-NON-reasoning is still the active simple tier — the
      // literal below does not match it, which is why the `-fast-reasoning`
      // suffix must stay exact.
      if (line.includes('grok-4.1-fast-reasoning')) {
        return 'grok-4.1-fast-reasoning retired — use xai/grok-4.3';
      }
      return null;
    },
  },
  {
    id: 'WORKSPACE',
    severity: 'fail',
    rule: '@bsuite/* consumers must use caret npm ranges — workspace:* and file:../packages/* break Vercel',
    skill: 'knowledge.md §Shared @bsuite/* packages',
    match: (line, file) => {
      if (!file.endsWith('package.json')) return null;
      if (!line.includes('@bsuite/')) return null;
      // Literal-after-key check: the line has `"@bsuite/...": "workspace:` or `"..." "file:`.

      // THE RULE POLICES CONSUMERS, AND UNTIL NOW IT DID NOT SAY SO IN CODE.
      // Its own headline is "@bsuite/* CONSUMERS must use caret npm ranges",
      // and the reason is Vercel: an app deployed from a submodule cannot
      // resolve `workspace:` because there is no workspace at its build root.
      // `packages/*` are the OTHER side of that relationship — workspace
      // MEMBERS, published to npm, never deployed to Vercel — and for them
      // `workspace:^` is the correct and required idiom, because pnpm rewrites
      // it to a real range at pack time.
      //
      // MEASURED, not assumed. Unpacking the published @bsuite/ui@1.2.0 tarball
      // shows real npm ranges and no `workspace:` specifier anywhere, while the
      // source declares `"@bsuite/theme": "workspace:^"` in both
      // peerDependencies and devDependencies. And every one of the four hits
      // this signal produced sat in packages/*/package.json; the six consuming
      // apps carried ZERO. So the guard was failing PRs over the one place the
      // idiom is correct, and had nothing to say about the place it is not.
      //
      // THE MEASUREMENT ABOVE IS TRUE. THE GENERALISATION FROM IT WAS NOT.
      // One tarball was unpacked — @bsuite/ui@1.2.0 — and the conclusion drawn
      // was that pnpm rewrites `workspace:` for every workspace member. On
      // 2026-08-18 the registry says otherwise:
      //
      //     @bsuite/page-builder@1.0.0
      //       peerDependencies: { "@bsuite/theme": "workspace:^" }
      //
      // The literal string reached npm and no consumer outside this workspace
      // can satisfy it. Whether the rewrite happens is a property of HOW a
      // package was published, not of what its source says — so no source-level
      // check, this one included, can answer the question.
      //
      // The exemption is therefore KEPT (flagging packages/* here would put two
      // guards in disagreement over the same lines, and the louder one wins),
      // but it is no longer the whole story. The invariant that actually matters
      // is enforced against the published artefact by
      // `scripts/check-published-peer-ranges.mjs`, which reads the registry.
      // Read that guard's verdict, not this exemption, for whether a published
      // package is installable.
      //
      // `file:` stays flagged everywhere, including here — a relative path is
      // wrong in a published package too, since it cannot survive packing.
      const isWorkspaceMember = /(^|\/)packages\/[^/]+\/package\.json$/.test(file);
      if (line.includes('"workspace:')) {
        return isWorkspaceMember
          ? null
          : '@bsuite/* uses workspace: — must be caret npm range';
      }
      if (line.includes('"file:')) return '@bsuite/* uses file: — must be caret npm range';
      return null;
    },
  },
  {
    id: 'NODE-PIN-DRIFT',
    severity: 'fail',
    rule: 'Node 24 is canonical — .node-version must be "24.x\\n" and engines.node must be "24.x" (exact patch pins produce Vercel warnings; bare "24" is ambiguous in setup-node)',
    skill: 'knowledge.md §Quickstart',
    match: (line, file) => {
      if (file.endsWith('.node-version')) {
        const content = line.trim();
        if (content && content !== '24.x') return `.node-version must be "24.x" (saw ${JSON.stringify(content)})`;
      }
      if (file.endsWith('package.json') && line.includes('"node"')) {
        // Regex needed to extract the value from a JSON line with quote-variant whitespace.
        const m = line.match(ENGINES_NODE_VALUE);
        if (m && m[1] !== '24.x') return `engines.node must be "24.x" (saw ${JSON.stringify(m[1])})`;
      }
      return null;
    },
  },
  {
    id: 'NON-PKCE-FLOW',
    severity: 'fail',
    rule: 'All Supabase clients must use flowType: "pkce" — implicit flow forbidden per OAuth 2.1 §4',
    skill: 'auth-setup + oauth-provider-check.yml',
    match: (line) => {
      if (FLOWTYPE_IMPLICIT.test(line)) return 'flowType: "implicit" is forbidden — use "pkce"';
      if (RESPONSE_TYPE_TOKEN.test(line)) return 'response_type=token is implicit flow — use authorization_code + PKCE';
      return null;
    },
  },
  {
    id: 'TAILWIND-V4-DEPREC',
    severity: 'warn',
    rule: 'Tailwind v4 — use shrink-0 not flex-shrink-0; grow-0 not flex-grow-0',
    skill: 'ui-styling + scripts/check-tailwind-v4.mjs',
    match: (line) => {
      // Pure literal checks — .includes() suffices (word-boundary unnecessary:
      // `-0` terminator makes `flex-shrink-0` unambiguous as a class token).
      const hasShrink = line.includes('flex-shrink-0');
      const hasGrow = line.includes('flex-grow-0');
      if (!hasShrink && !hasGrow) return null;
      // Gate: must appear in a class-attribute or a quoted-string context.
      const inClassAttr = line.includes('className=') || line.includes('class=')
                        || line.includes('classNames(') || line.includes('cn(')
                        || line.includes('clsx(') || line.includes('tw`');
      const bareInString = line.includes('"') || line.includes("'") || line.includes('`');
      if (!inClassAttr && !bareInString) return null;
      if (hasShrink) return 'flex-shrink-0 → shrink-0 (Tailwind v4)';
      if (hasGrow) return 'flex-grow-0 → grow-0 (Tailwind v4)';
      return null;
    },
  },
  {
    id: 'AS-ANY-CAST',
    severity: 'warn',
    rule: 'No "as any" casts — AGENTS.md §Code forbids untyped any; use proper types',
    skill: 'AGENTS.md §Code',
    match: (line, file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return null;
      // Comment skip: leading `//`, `/*`, or `*` after optional whitespace.
      const stripped = line.replace(/^\s*/, '');
      if (stripped.startsWith('//') || stripped.startsWith('/*') || stripped.startsWith('*')) return null;
      // Regex needed: whitespace-flex + word-boundary (`.includes(' as any')` would miss `as any;`).
      if (AS_ANY.test(line)) return 'as any cast — use a proper type';
      return null;
    },
  },
  {
    id: 'NEW-HEX-IN-D2C',
    severity: 'fail',
    rule: 'D2C apps use oklch() via --role-* tokens; raw hex is reserved for braden (corporate brand). Promoted warn -> fail 2026-07-17 (W3 §3.6, bsuite#902) — the signal already scans NEW lines only, so no legacy amnesty is needed. Annotate a genuine exception with `theme-audit-ok: <reason>`, the same marker scripts/audit-d2c-theme.sh honours.',
    skill: 'bsuite-brand-system',
    // OPT-IN, per signal — never global. `theme-audit-ok` is a THEME exception and
    // must not become a blanket "ignore this line" pragma: if the scan loop applied
    // it to every signal, a one-line comment would also switch off COOKIE-SSO, the
    // auth gate this scanner exists to enforce. Only signals that carry the flag
    // below can be suppressed by it, and only NEW-HEX-IN-D2C does.
    suppressedByAuditOk: true,
    match: (line, file, fw, repo) => {
      if (repo === 'braden') return null; // corporate-brand exception
      const isUiFile = file.endsWith('.tsx') || file.endsWith('.ts')
                    || file.endsWith('.jsx') || file.endsWith('.js')
                    || file.endsWith('.css') || file.endsWith('.scss');
      if (!isUiFile) return null;
      // Test fixtures legitimately use hex values to assert cascade/rendering behavior.
      // Cycle-4 learning: bsuite#879 cascade.test.ts produced 16 false-positive NEW-HEX hits.
      if (TEST_PATH_FRAGMENTS.some((f) => file.includes(f))) return null;
      if (TEST_FILE_SUFFIXES.some((s) => file.endsWith(s))) return null;
      // Comment skip.
      const stripped = line.replace(/^\s*/, '');
      if (stripped.startsWith('//') || stripped.startsWith('/*')
          || stripped.startsWith('*') || stripped.startsWith('<!--')) return null;
      // Gate: must have at least one color-context literal AND a hex-looking token.
      if (!line.includes('#')) return null;
      // Find the earliest color-context gate position in the line.
      let colorCtxIdx = -1;
      for (const g of COLOR_PROP_GATES) {
        const i = line.indexOf(g);
        if (i !== -1 && (colorCtxIdx === -1 || i < colorCtxIdx)) colorCtxIdx = i;
      }
      const styleIdx = line.indexOf('style={{');
      if (styleIdx !== -1 && (colorCtxIdx === -1 || styleIdx < colorCtxIdx)) colorCtxIdx = styleIdx;
      if (colorCtxIdx === -1) return null;
      // Search for hex ONLY in the portion of the line after the color-context gate,
      // AND before any trailing line-comment. This handles two edge cases:
      //   (1) multi-hash lines: `const x = "#abc"; style={{ color: "#def" }}`
      //       — slice starts at `style={{` so we correctly find `#def`, not `#abc`.
      //   (2) false-positive: `interface Foo { color: string } // see #863`
      //       — strip mid-line `//` comment before hex-match, so `#863` is excluded.
      const suffix = line.slice(colorCtxIdx);
      const commentIdx = suffix.indexOf('//');
      const searchSpace = commentIdx === -1 ? suffix : suffix.slice(0, commentIdx);
      // Regex needed: extract the hex value substring for the report; char class bounded.
      const m = searchSpace.match(HEX_COLOR_NARROW);
      if (!m) return null;
      return `raw hex #${m[1]} in color context — use oklch() via --role-* token`;
    },
  },
  {
    id: 'GETSESSION-AUTHZ',
    severity: 'warn',
    rule: 'Use supabase.auth.getClaims() for authz decisions — getSession() returns cached data',
    skill: 'supabase + AUTH_CANONICAL.md',
    match: (line, file) => {
      if (!file.endsWith('.ts') && !file.endsWith('.tsx')) return null;
      const lowerFile = file.toLowerCase();
      const inAuthHotpath = lowerFile.includes('auth') || lowerFile.includes('middleware')
                         || lowerFile.includes('guard') || lowerFile.includes('protected')
                         || lowerFile.includes('session') || lowerFile.includes('authorize');
      if (!inAuthHotpath) return null;
      const stripped = line.replace(/^\s*/, '');
      if (stripped.startsWith('//') || stripped.startsWith('/*') || stripped.startsWith('*')) return null;
      // Literal check — .includes() is sufficient for this method-call form.
      if (line.includes('.auth.getSession()')) return 'auth.getSession() for authz — use getClaims() instead';
      return null;
    },
  },
];

// ─── Framework detection ──────────────────────────────────────────────────

function detectFramework(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) return 'unknown';
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    if (deps['next']) return 'nextjs';
    if (deps['@tanstack/start'] || deps['@tanstack/react-start']) return 'tanstack-start';
    if (deps['vite']) return 'vite-react';
  } catch {}
  return 'unknown';
}

function detectRepoName(repoRoot) {
  const pkgPath = path.join(repoRoot, 'package.json');
  if (!existsSync(pkgPath)) return path.basename(repoRoot);
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    return pkg.name || path.basename(repoRoot);
  } catch {
    return path.basename(repoRoot);
  }
}

// ─── Diff parsing ─────────────────────────────────────────────────────────

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    throw new Error(`git ${cmd} failed: ${err.message}`);
  }
}

function resolveDiffRange() {
  if (ARGS.base && ARGS.head) return { base: ARGS.base, head: ARGS.head };
  const base = process.env.GITHUB_BASE_REF;
  if (base) {
    try { runGit(`fetch --no-tags --depth=50 origin ${base}`); } catch {}
    return { base: `origin/${base}`, head: 'HEAD' };
  }
  try {
    const mergeBase = runGit('merge-base origin/main HEAD').trim();
    return { base: mergeBase, head: 'HEAD' };
  } catch {
    return { base: 'HEAD~1', head: 'HEAD' };
  }
}

function getUnifiedDiff({ base, head }) {
  return runGit(`diff --unified=0 ${base}...${head}`);
}

// Regex NEEDED here: unified-diff header format is fixed by git; parsing by
// hand is simpler with a narrow regex on the `diff --git` line. Single pattern,
// 32 chars, bounded capture groups. ReDoS-safe.
const DIFF_GIT_HEADER = /^diff --git a\/(\S+) b\/(\S+)/;
const DIFF_HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)/;

function parseDiff(diff) {
  const byFile = {};
  let current = null;
  let nextLineNumber = 0;
  for (const line of diff.split('\n')) {
    const m = line.match(DIFF_GIT_HEADER);
    if (m) {
      current = m[2];
      byFile[current] = [];
      nextLineNumber = 0;
      continue;
    }
    if (!current) continue;
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    const hunk = line.match(DIFF_HUNK_HEADER);
    if (hunk) {
      nextLineNumber = Number(hunk[1]);
      continue;
    }
    if (line.startsWith('+')) {
      byFile[current].push({ text: line.slice(1), lineNumber: nextLineNumber });
      nextLineNumber++;
      continue;
    }
    if (line.startsWith('-')) continue;
    if (nextLineNumber > 0) {
      nextLineNumber++;
    }
  }
  return byFile;
}

// ─── Scan ─────────────────────────────────────────────────────────────────

function isCookieSsoCodeFile(file) {
  return CODE_FILE_SUFFIXES.some((ext) => file.endsWith(ext));
}

function isCookieSsoTestFile(file) {
  if (TEST_PATH_FRAGMENTS.some((fragment) => file.includes(fragment))) return true;
  return TEST_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix));
}

function isNextServerCookieFile(file, fw) {
  if (fw !== 'nextjs') return false;
  return file.endsWith('middleware.ts') || file.endsWith('route.ts')
      || file.endsWith('actions.ts') || file.includes('/api/')
      || file.includes('/server/') || file.includes('/auth/');
}

function normalizeAddedLines(lines) {
  return lines.map((line, idx) => (
    typeof line === 'string'
      ? { text: line, lineNumber: idx + 1 }
      : { text: line.text, lineNumber: line.lineNumber ?? idx + 1 }
  ));
}

// True when `entries[idx]` carries the deliberate-exception marker on its own
// text, or on the line IMMEDIATELY ABOVE it in the file.
//
// Adjacency is tested on `lineNumber`, never on array position. `entries` holds
// only the ADDED lines of a diff, so entries[idx - 1] is routinely hundreds of
// lines away in the real file; comparing array positions would let one annotated
// addition silence an unrelated addition elsewhere in the same file — a hole big
// enough to drive the whole signal through.
//
// Known and accepted limit: when a line is added UNDER a marker comment that
// already existed, the marker is not part of the diff and this returns false.
// The scan then reports a hit the shell audit would have suppressed. That
// direction is the safe one — a false positive is a nuisance, a false negative
// is drift shipped — and the same-line form has no such gap, which is why the
// two vite.config.ts webmanifest lines annotate inline.
function hasAuditOkMarker(entries, idx) {
  const entry = entries[idx];
  if (entry.text.includes(AUDIT_OK_MARKER)) return true;
  if (idx === 0) return false;
  const prev = entries[idx - 1];
  if (prev.lineNumber !== entry.lineNumber - 1) return false;
  return prev.text.includes(AUDIT_OK_MARKER);
}

function isCookieSsoIdentChar(ch) {
  return (ch >= 'a' && ch <= 'z')
      || (ch >= 'A' && ch <= 'Z')
      || (ch >= '0' && ch <= '9')
      || ch === '_' || ch === '$';
}

function findCookieSsoIdentifierIndices(line, name) {
  const hits = [];
  let from = 0;
  while (from < line.length) {
    const idx = line.indexOf(name, from);
    if (idx === -1) break;
    const before = idx === 0 ? '' : line[idx - 1];
    const after = idx + name.length >= line.length ? '' : line[idx + name.length];
    if (!isCookieSsoIdentChar(before) && !isCookieSsoIdentChar(after)) hits.push(idx);
    from = idx + name.length;
  }
  return hits;
}

function findCookieSsoPrevSignificant(line, idx) {
  for (let i = idx - 1; i >= 0; i--) {
    const ch = line[i];
    if (ch !== ' ' && ch !== '\t') return ch;
  }
  return '';
}

function findCookieSsoNextSignificant(line, idx) {
  for (let i = idx; i < line.length; i++) {
    const ch = line[i];
    if (ch !== ' ' && ch !== '\t') return ch;
  }
  return '';
}

function maskCookieSsoChar(ch) {
  // Preserve tabs so sanitized lines keep their original indentation/column shape.
  return ch === '\t' ? '\t' : ' ';
}

function sanitizeCookieSsoEntries(entries) {
  const sanitized = [];
  let inBlockComment = false;
  for (const entry of entries) {
    const chars = entry.text.split('');
    let quote = '';
    let templateExprDepth = 0;
    let inRegex = false;
    let inRegexClass = false;
    let escaped = false;
    let prevSignificant = '';
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const next = chars[i + 1] ?? '';
      if (inBlockComment) {
        if (ch === '*' && next === '/') {
          chars[i] = maskCookieSsoChar(ch);
          chars[i + 1] = maskCookieSsoChar(next);
          i++;
          inBlockComment = false;
        } else {
          chars[i] = maskCookieSsoChar(ch);
        }
        continue;
      }
      if (quote) {
        if (quote === '`' && !escaped && ch === '$' && next === '{') {
          chars[i] = maskCookieSsoChar(ch);
          chars[i + 1] = maskCookieSsoChar(next);
          i++;
          quote = '';
          templateExprDepth = 1;
          prevSignificant = '{';
          continue;
        }
        chars[i] = maskCookieSsoChar(ch);
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === quote) quote = '';
        continue;
      }
      if (inRegex) {
        chars[i] = maskCookieSsoChar(ch);
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '[') {
          inRegexClass = true;
          continue;
        }
        if (ch === ']' && inRegexClass) {
          inRegexClass = false;
          continue;
        }
        if (ch === '/' && !inRegexClass) inRegex = false;
        continue;
      }
      if (ch === '/' && next === '/') {
        for (let j = i; j < chars.length; j++) {
          chars[j] = maskCookieSsoChar(chars[j]);
        }
        break;
      }
      if (ch === '/' && next === '*') {
        chars[i] = maskCookieSsoChar(ch);
        chars[i + 1] = maskCookieSsoChar(next);
        i++;
        inBlockComment = true;
        continue;
      }
      if (ch === '\'' || ch === '"' || ch === '`') {
        chars[i] = maskCookieSsoChar(ch);
        quote = ch;
        continue;
      }
      if (templateExprDepth > 0) {
        if (ch === '{') templateExprDepth++;
        if (ch === '}') {
          templateExprDepth--;
          if (templateExprDepth === 0) {
            chars[i] = maskCookieSsoChar(ch);
            quote = '`';
            continue;
          }
        }
      }
      if (ch === '/') {
        const startsRegex = !prevSignificant || COOKIE_SSO_REGEX_PREFIX_CHARS.includes(prevSignificant);
        if (startsRegex) {
          chars[i] = maskCookieSsoChar(ch);
          inRegex = true;
          inRegexClass = false;
          escaped = false;
          continue;
        }
      }
      if (ch !== ' ' && ch !== '\t') prevSignificant = ch;
    }
    sanitized.push({ ...entry, text: chars.join('') });
  }
  return sanitized;
}

function scanCookieSsoWithoutParser(file, entries) {
  const isTestFile = isCookieSsoTestFile(file);
  const hits = [];
  const seen = new Set();
  const sanitizedEntries = sanitizeCookieSsoEntries(entries);
  for (let i = 0; i < sanitizedEntries.length; i++) {
    const entry = sanitizedEntries[i];
    const originalEntry = entries[i] ?? entry;
    const line = entry.text;
    const trimmed = line.trimStart();
    const fromIdx = line.indexOf(' from ');
    for (const name of ['cookieStorage', 'createCookieStorage']) {
      for (const idx of findCookieSsoIdentifierIndices(line, name)) {
        const next = findCookieSsoNextSignificant(line, idx + name.length);
        const prev = findCookieSsoPrevSignificant(line, idx);
        let reason = null;
        if (next === '(') {
          reason = name === 'createCookieStorage'
            ? 'createCookieStorage is forbidden'
            : 'cookieStorage is forbidden on browser clients';
        } else if (!isTestFile && trimmed.startsWith('import ') && fromIdx !== -1 && idx < fromIdx) {
            reason = name === 'createCookieStorage'
              ? 'createCookieStorage import is forbidden'
              : 'cookieStorage import is forbidden on browser clients';
        } else if (!isTestFile && (prev === '=' || prev === '.' || prev === ':')) {
          // `:` is the object-property value position — `storage: cookieStorage,`
          // inside a createClient auth block. That is THE canonical forbidden
          // pattern (CLAUDE.md names it first), and omitting `:` here meant the
          // most important case was the one this rule did not catch.
          reason = name === 'createCookieStorage'
            ? 'createCookieStorage is forbidden'
            : 'cookieStorage is forbidden on browser clients';
        }
        if (!reason) continue;
        const key = `${entry.lineNumber}:${reason}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          signal: 'COOKIE-SSO',
          severity: 'fail',
          rule: 'Cookie SSO removed suite-wide 2025-02-27 — use per-domain localStorage + PKCE',
          skill: 'auth-setup + AUTH_CANONICAL.md',
          file,
          line: originalEntry.text.slice(0, 300),
          reason,
        });
      }
    }
  }
  return hits;
}

function getCookieSsoParser() {
  if (cookieSsoParser) return cookieSsoParser;
  for (const req of COOKIE_SSO_PARSER_CANDIDATES) {
    try {
      cookieSsoParser = req('@typescript-eslint/parser');
      return cookieSsoParser;
    } catch {}
  }
  throw new Error('COOKIE-SSO scan requires @typescript-eslint/parser (tried repo root and packages/dry-lint)');
}

function parseCookieSsoAst(source, file) {
  const parser = getCookieSsoParser();
  const options = {
    ecmaVersion: 'latest',
    sourceType: 'module',
    loc: true,
    range: true,
    ecmaFeatures: { jsx: file.endsWith('.jsx') || file.endsWith('.tsx') },
  };
  try {
    return parser.parse(source, options);
  } catch {
    return parser.parse(source, { ...options, sourceType: 'script' });
  }
}

function getCookieStorageTargetName(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'Identifier') {
    if (node.name === 'cookieStorage') return node.name;
    if (node.name === 'createCookieStorage') return node.name;
    return null;
  }
  if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression') && !node.computed) {
    const objectName = getCookieStorageTargetName(node.object);
    if (objectName) return objectName;
    return getCookieStorageTargetName(node.property);
  }
  return null;
}

function getStandaloneCookieIdentifierName(node, parent) {
  const name = getCookieStorageTargetName(node);
  if (!name || node.type !== 'Identifier' || !parent) return null;
  if ((parent.type === 'MemberExpression' || parent.type === 'OptionalMemberExpression')
      && parent.property === node && !parent.computed) return null;
  if ((parent.type === 'Property' || parent.type === 'PropertyDefinition')
      && parent.key === node && !parent.computed) return null;
  if (parent.type === 'MethodDefinition' && parent.key === node && !parent.computed) return null;
  if ((parent.type === 'ImportSpecifier' || parent.type === 'ImportDefaultSpecifier'
      || parent.type === 'ImportNamespaceSpecifier') && parent.local === node) return null;
  if ((parent.type === 'VariableDeclarator' || parent.type === 'FunctionDeclaration'
      || parent.type === 'FunctionExpression' || parent.type === 'ClassDeclaration'
      || parent.type === 'ClassExpression' || parent.type === 'TSTypeAliasDeclaration'
      || parent.type === 'TSInterfaceDeclaration') && parent.id === node) return null;
  if ((parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression'
      || parent.type === 'ArrowFunctionExpression') && parent.params.includes(node)) return null;
  if (parent.type.startsWith('TS')) return null;
  return name;
}

function walkAst(node, visit, parent = null) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkAst(child, visit, parent);
    return;
  }
  if (typeof node.type === 'string') visit(node, parent);
  for (const value of Object.values(node)) {
    if (!value || typeof value !== 'object') continue;
    walkAst(value, visit, node);
  }
}

function scanCookieSsoAst(file, entries) {
  if (!isCookieSsoCodeFile(file)) return [];
  const sourcePath = path.join(process.cwd(), file);
  const sourceCandidates = [];
  if (existsSync(sourcePath)) sourceCandidates.push({ source: readFileSync(sourcePath, 'utf8'), usesSnippetLines: false });
  sourceCandidates.push({ source: entries.map((entry) => entry.text).join('\n'), usesSnippetLines: true });
  let ast = null;
  let usesSnippetLines = false;
  for (const candidate of sourceCandidates) {
    try {
      ast = parseCookieSsoAst(candidate.source, file);
      usesSnippetLines = candidate.usesSnippetLines;
      break;
    } catch {}
  }
  if (!ast) return scanCookieSsoWithoutParser(file, entries);
  const isTestFile = isCookieSsoTestFile(file);
  const addedLineNumbers = new Set(entries.map((entry) => entry.lineNumber));
  const entriesByLine = new Map(entries.map((entry) => [entry.lineNumber, entry]));
  const hits = [];
  const seen = new Set();
  function addHit(lineNumber, reason) {
    const finalLineNumber = usesSnippetLines
      ? (entries[lineNumber - 1]?.lineNumber ?? lineNumber)
      : lineNumber;
    if (!addedLineNumbers.has(finalLineNumber)) return;
    const entry = entriesByLine.get(finalLineNumber);
    if (!entry) return;
    const key = `${finalLineNumber}:${reason}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({
      signal: 'COOKIE-SSO',
      severity: 'fail',
      rule: 'Cookie SSO removed suite-wide 2025-02-27 — use per-domain localStorage + PKCE',
      skill: 'auth-setup + AUTH_CANONICAL.md',
      file,
      line: entry.text.slice(0, 300),
      reason,
    });
  }

  walkAst(ast, (node, parent) => {
    if (node.type === 'CallExpression' || node.type === 'NewExpression') {
      const name = getCookieStorageTargetName(node.callee);
      if (!name || !node.loc?.start?.line) return;
      const reason = name === 'createCookieStorage'
        ? 'createCookieStorage is forbidden'
        : 'cookieStorage is forbidden on browser clients';
      addHit(node.loc.start.line, reason);
      return;
    }

    if (isTestFile) return;

    if (node.type === 'ImportSpecifier' && node.imported?.type === 'Identifier') {
      const name = getCookieStorageTargetName(node.imported);
      if (!name || !node.loc?.start?.line) return;
      const reason = name === 'createCookieStorage'
        ? 'createCookieStorage import is forbidden'
        : 'cookieStorage import is forbidden on browser clients';
      addHit(node.loc.start.line, reason);
      return;
    }

    if (node.type === 'Identifier') {
      const name = getStandaloneCookieIdentifierName(node, parent);
      if (!name || !node.loc?.start?.line) return;
      const reason = name === 'createCookieStorage'
        ? 'createCookieStorage is forbidden'
        : 'cookieStorage is forbidden on browser clients';
      addHit(node.loc.start.line, reason);
      return;
    }

    if ((node.type === 'MemberExpression' || node.type === 'OptionalMemberExpression')
        && parent?.type !== 'CallExpression'
        && parent?.type !== 'NewExpression') {
      const name = getCookieStorageTargetName(node);
      if (!name || !node.loc?.start?.line) return;
      const reason = name === 'createCookieStorage'
        ? 'createCookieStorage is forbidden'
        : 'cookieStorage is forbidden on browser clients';
      addHit(node.loc.start.line, reason);
    }
  });

  return hits;
}

function scanCookieSsoFile(file, entries, framework) {
  if (isNextServerCookieFile(file, framework)) return [];
  const hits = scanCookieSsoAst(file, entries);
  if (isCookieSsoTestFile(file)) return hits;
  for (const entry of entries) {
    if (DOMAIN_CRM7_APP.test(entry.text)) {
      hits.push({
        signal: 'COOKIE-SSO',
        severity: 'fail',
        rule: 'Cookie SSO removed suite-wide 2025-02-27 — use per-domain localStorage + PKCE',
        skill: 'auth-setup + AUTH_CANONICAL.md',
        file,
        line: entry.text.slice(0, 300),
        reason: 'domain=.crm7.app cookie is forbidden',
      });
    }
    if (STORAGE_KEY_LEGACY.test(entry.text)) {
      hits.push({
        signal: 'COOKIE-SSO',
        severity: 'fail',
        rule: 'Cookie SSO removed suite-wide 2025-02-27 — use per-domain localStorage + PKCE',
        skill: 'auth-setup + AUTH_CANONICAL.md',
        file,
        line: entry.text.slice(0, 300),
        reason: "storageKey 'business_suite_auth' is forbidden",
      });
    }
  }
  return hits;
}

function scan({ addedByFile, framework, repoName }) {
  const hits = [];
  for (const [file, lines] of Object.entries(addedByFile)) {
    // Skip the scanner's own source + sibling lint scripts — self-scan paradox
    // prevention (bsuite#902). These files contain drift literals by necessity.
    if (isSelfScanExcluded(file)) continue;
    const entries = normalizeAddedLines(lines);
    hits.push(...scanCookieSsoFile(file, entries, framework));
    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      const line = entry.text;
      // Computed once per line, not once per signal — the marker is a property
      // of the LINE, and the lookup walks the previous entry.
      const auditOk = hasAuditOkMarker(entries, idx);
      for (const sig of SIGNALS) {
        if (sig.id === 'COOKIE-SSO') continue;
        if (auditOk && sig.suppressedByAuditOk) continue;
        const reason = sig.match(line, file, framework, repoName);
        if (reason) {
          hits.push({
            signal: sig.id,
            severity: sig.severity,
            rule: sig.rule,
            skill: sig.skill,
            file,
            line: line.slice(0, 300),
            reason,
          });
        }
      }
    }
  }
  return hits;
}

// ─── Output ───────────────────────────────────────────────────────────────

function emitMarkdown(hits, framework, repoName) {
  if (hits.length === 0) {
    return `## ✅ BSuite drift scan — clean\n\n0 drift hits across ${SIGNALS.length} signals (framework: \`${framework}\`, repo: \`${repoName}\`).\n\nReference: [bsuite#902](https://github.com/GaryOcean428/bsuite/issues/902)\n`;
  }

  const fails = hits.filter((h) => h.severity === 'fail');
  const warns = hits.filter((h) => h.severity === 'warn');

  const header = fails.length > 0
    ? `## ❌ BSuite drift scan — ${fails.length} hard-fail + ${warns.length} warn\n\nMerge-blocking drift found. Fix hard-fail items before merge.`
    : `## ⚠️ BSuite drift scan — ${warns.length} warn (no hard-fails)\n\nAdvisory only — not merge-blocking. Please review.`;

  const bySignal = {};
  for (const h of hits) (bySignal[h.signal] ??= []).push(h);

  const sections = Object.entries(bySignal).map(([sig, items]) => {
    const sev = items[0].severity === 'fail' ? '🛑 hard-fail' : '⚠️ warn';
    const { rule, skill } = items[0];
    const rows = items.map((h) => {
      // Slice first, then escape pipes — prevents trailing-backslash corruption.
      const truncated = h.line.slice(0, 160).trim();
      const escaped = truncated.split('|').join('\\|');
      return `| \`${h.file}\` | \`${escaped}\` | ${h.reason} |`;
    }).join('\n');
    return `### \`${sig}\` — ${sev}\n**Rule:** ${rule}\n**Skill:** ${skill}\n\n| File | Offending line | Reason |\n|------|----------------|--------|\n${rows}`;
  });

  const footer = `---\nFramework: **${framework}** · Repo: **${repoName}** · Reference: [bsuite#902](https://github.com/GaryOcean428/bsuite/issues/902)\n\n*Auto-generated by \`scripts/drift-scan.mjs\` — updates on each push.*`;

  return [header, '', sections.join('\n\n'), '', footer].join('\n');
}

// ─── Self-test ────────────────────────────────────────────────────────────

function selfTest() {
  const fixtures = [
    { name: 'COOKIE-SSO — browser client flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ["  auth: { storageKey: 'business_suite_auth', flowType: 'pkce' }"] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.severity === 'fail') },
    { name: 'COOKIE-SSO — browser identifier call flagged via AST', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['const store = cookieStorage();'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.line.includes('cookieStorage();')) },
    { name: 'COOKIE-SSO — browser import flagged via AST', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ["import { cookieStorage } from '@supabase/ssr';"] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.reason.includes('import')) },
    { name: 'COOKIE-SSO — browser identifier reference flagged via AST', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['const store = cookieStorage;'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.line.includes('const store = cookieStorage;')) },
    // Regression guard: `storage: cookieStorage,` in a createClient auth block is
    // THE canonical forbidden pattern (CLAUDE.md names it first). The AST rule
    // originally accepted only `=` and `.` as assignment context, so the
    // object-property position — the one that actually appears in real code —
    // silently passed. crm7's blunter word-match copy caught it; this one did not.
    { name: 'COOKIE-SSO — object-property value position flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['  storage: cookieStorage,'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.severity === 'fail') },
    { name: 'COOKIE-SSO — Next.js middleware NOT flagged', framework: 'nextjs', repoName: 'conduit',
      addedByFile: { 'src/middleware.ts': ["  cookies().set('sb-access', token, { httpOnly: true })"] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — domain=.crm7.app flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ["  cookieStorage({ domain: '.crm7.app' })"] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — non-test string literal NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ["const token = 'cookieStorage';"] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — non-test template literal NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['const token = `cookieStorage`;'] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — non-test regex literal NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['const forbidden = /cookieStorage/;'] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — template expression call IS flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['const token = `${cookieStorage()}`;'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.line.includes('cookieStorage()')) },
    { name: 'COOKIE-SSO — negative assertion test NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/__tests__/portal-scope-contract.test.ts': ['expect(src).not.toMatch(/cookieStorage/);'] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — legacy token assertion test NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/__tests__/portal-scope-contract.test.ts': ["expect(src).not.toContain('business_suite_auth');"] },
      expect: (hits) => hits.every((h) => h.signal !== 'COOKIE-SSO') },
    { name: 'COOKIE-SSO — test file actual call IS flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/__tests__/portal-scope-contract.test.ts': ['expect(cookieStorage()).toBeDefined();'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.line.includes('expect(cookieStorage()).toBeDefined();')) },
    { name: 'COOKIE-SSO — test file createCookieStorage call IS flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/__tests__/portal-scope-contract.test.ts': ['expect(createCookieStorage()).toBeDefined();'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.reason.includes('createCookieStorage')) },
    { name: 'STALE-GROK — retired model flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/ai.ts': ["  model: 'xai/grok-4.1-fast-reasoning',"] },
      expect: (hits) => hits.some((h) => h.signal === 'STALE-GROK') },
    { name: 'WORKSPACE — workspace:* flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'package.json': ['    "@bsuite/auth": "workspace:*",'] },
      expect: (hits) => hits.some((h) => h.signal === 'WORKSPACE') },
    { name: 'WORKSPACE — file:../packages flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'package.json': ['    "@bsuite/auth": "file:../packages/auth",'] },
      expect: (hits) => hits.some((h) => h.signal === 'WORKSPACE') },
    { name: 'WORKSPACE — workspace:^ in a workspace MEMBER is NOT flagged', framework: 'vite-react', repoName: 'bsuite',
      addedByFile: { 'packages/ui/package.json': ['    "@bsuite/theme": "workspace:^",'] },
      expect: (hits) => !hits.some((h) => h.signal === 'WORKSPACE') },
    { name: 'WORKSPACE — a CONSUMER app still flagged after the member exemption', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'package.json': ['    "@bsuite/theme": "workspace:^",'] },
      expect: (hits) => hits.some((h) => h.signal === 'WORKSPACE') },
    { name: 'WORKSPACE — file: in a workspace MEMBER is STILL flagged', framework: 'vite-react', repoName: 'bsuite',
      addedByFile: { 'packages/ui/package.json': ['    "@bsuite/theme": "file:../theme",'] },
      expect: (hits) => hits.some((h) => h.signal === 'WORKSPACE') },
    { name: 'NODE-PIN-DRIFT — .node-version != 24.x flagged (bare "22")', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { '.node-version': ['22'] },
      expect: (hits) => hits.some((h) => h.signal === 'NODE-PIN-DRIFT') },
    { name: 'NODE-PIN-DRIFT — bare "24" flagged (silent LTS-22 fallback)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { '.node-version': ['24'] },
      expect: (hits) => hits.some((h) => h.signal === 'NODE-PIN-DRIFT') },
    { name: 'NODE-PIN-DRIFT — .node-version 24.x NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { '.node-version': ['24.x'] },
      expect: (hits) => hits.every((h) => h.signal !== 'NODE-PIN-DRIFT') },
    { name: 'NODE-PIN-DRIFT — engines.node != 24.x flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'package.json': ['  "engines": { "node": "22" }'] },
      expect: (hits) => hits.some((h) => h.signal === 'NODE-PIN-DRIFT') },
    { name: 'NODE-PIN-DRIFT — engines.node 24.x NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'package.json': ['  "engines": { "node": "24.x" }'] },
      expect: (hits) => hits.every((h) => h.signal !== 'NODE-PIN-DRIFT') },
    { name: 'TAILWIND-V4-DEPREC — flex-shrink-0 flagged (crm7#679)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/billing/annual-review.tsx': ['      <div className="flex items-center gap-2 flex-shrink-0">'] },
      expect: (hits) => hits.some((h) => h.signal === 'TAILWIND-V4-DEPREC' && h.severity === 'warn') },
    { name: 'TAILWIND-V4-DEPREC — flex-grow-0 flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/foo.tsx': ['<div className="flex-grow-0">foo</div>'] },
      expect: (hits) => hits.some((h) => h.signal === 'TAILWIND-V4-DEPREC') },
    { name: 'NEW-HEX-IN-D2C — hex in inline style flagged as HARD-FAIL (conduit#224; promoted W3 §3.6)', framework: 'nextjs', repoName: 'conduit',
      addedByFile: { 'src/components/settings/PipelineStagesSection.tsx': ["        style={{ backgroundColor: stage.color ?? '#3b82f6' }}"] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.severity === 'fail') },
    { name: 'NEW-HEX-IN-D2C — braden (corporate) NOT flagged', framework: 'vite-react', repoName: 'braden',
      addedByFile: { 'src/components/Hero.tsx': ["  background: '#ab233a',"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — comment issue ref #863 NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/foo.tsx': ['// See #863 for context'] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — non-comment #863 NOT flagged (no color context)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/foo.tsx': ["  title: 'Fix for #863 and #999'"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    // ── theme-audit-ok parity (crm7#1724) ────────────────────────────────
    // Paired by construction: every suppression case is followed by the SAME
    // line without the marker. A suppression test that only proves the quiet
    // direction cannot tell "the marker works" from "the signal stopped
    // working", which is the failure mode that matters for a hard-fail gate.
    { name: 'NEW-HEX-IN-D2C — same-line theme-audit-ok suppresses (webmanifest, crm7#1724)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'vite.config.ts': ["          theme_color: '#2563eb', // theme-audit-ok: webmanifest needs literal hex"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — the SAME line without the marker still hard-fails', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'vite.config.ts': ["          theme_color: '#2563eb',"] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.severity === 'fail') },
    // #0a0e1a is the estate's prescribed near-black (bsuite#1976) — a
    // contract-conformant value the scan flagged purely for being hex.
    { name: 'NEW-HEX-IN-D2C — preceding-line theme-audit-ok suppresses (eslint-disable-next-line form)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'vite.config.ts': [
        '          // theme-audit-ok: webmanifest needs literal hex',
        "          background_color: '#0a0e1a',",
      ] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — the same pair without the marker still hard-fails', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'vite.config.ts': [
        '          // webmanifest needs literal hex',
        "          background_color: '#0a0e1a',",
      ] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.severity === 'fail') },
    // Adjacency is by FILE line number, not array position. Both entries below
    // are "previous" in the array; only a true line-1 gap may suppress.
    { name: 'NEW-HEX-IN-D2C — marker on a NON-adjacent added line does NOT suppress', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/foo.tsx': [
        { text: '  // theme-audit-ok: applies to line 10 only', lineNumber: 10 },
        { text: "  <div style={{ color: '#ff0000' }} />", lineNumber: 412 },
      ] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.severity === 'fail') },
    // Scoping: the marker is a THEME opt-out and must not become a blanket
    // line-level pragma. If it silenced every signal, one comment would switch
    // off the auth gate.
    { name: 'theme-audit-ok does NOT suppress COOKIE-SSO (opt-in is per signal)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ['  storage: cookieStorage, // theme-audit-ok: nice try'] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO' && h.severity === 'fail') },
    { name: 'theme-audit-ok does NOT suppress AS-ANY-CAST (opt-in is per signal)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/foo.ts': ['  const x = y as any; // theme-audit-ok: nice try'] },
      expect: (hits) => hits.some((h) => h.signal === 'AS-ANY-CAST') },
    { name: 'NEW-HEX-IN-D2C — URL fragment /#abc123 NOT flagged', framework: 'nextjs', repoName: 'conduit',
      addedByFile: { 'src/components/Link.tsx': ['  <a href="/docs/page#abc123">link</a>'] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — CSS color: #hex flagged as HARD-FAIL', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/styles/foo.css': ['  color: #2563eb;'] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.severity === 'fail') },
    { name: 'NEW-HEX-IN-D2C — planted new D2C hex causes non-zero exit via scan() severity (W3 §3.6 red proof)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/dashboard/Overview.tsx': ["  <div style={{ color: '#123abc' }}>planted</div>"] },
      expect: (hits) => hits.filter((h) => h.severity === 'fail').some((h) => h.signal === 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — green proof: same file with the hex replaced by a role token produces zero hits', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/dashboard/Overview.tsx': ['  <div className="text-primary">clean</div>'] },
      expect: (hits) => hits.length === 0 },
    { name: 'AS-ANY-CAST — flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/foo.ts': ['  const x = bar as any;'] },
      expect: (hits) => hits.some((h) => h.signal === 'AS-ANY-CAST') },
    { name: 'AS-ANY-CAST — as any[] also flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/foo.ts': ['  const x = bar as any[];'] },
      expect: (hits) => hits.some((h) => h.signal === 'AS-ANY-CAST') },
    { name: 'AS-ANY-CAST — comment NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/foo.ts': ['// avoid as any — use proper types'] },
      expect: (hits) => hits.every((h) => h.signal !== 'AS-ANY-CAST') },
    { name: 'GETSESSION-AUTHZ — flagged in auth file', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/auth/guard.ts': ['  const { data } = await supabase.auth.getSession();'] },
      expect: (hits) => hits.some((h) => h.signal === 'GETSESSION-AUTHZ') },
    { name: 'GETSESSION-AUTHZ — non-auth file NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/home.tsx': ['  const { data } = await supabase.auth.getSession();'] },
      expect: (hits) => hits.every((h) => h.signal !== 'GETSESSION-AUTHZ') },
    { name: 'NON-PKCE-FLOW — implicit flow flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/supabase.ts': ["  auth: { flowType: 'implicit' }"] },
      expect: (hits) => hits.some((h) => h.signal === 'NON-PKCE-FLOW') },
    { name: 'NEW-HEX-IN-D2C — color: string + unrelated #863 NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/types/foo.ts': ['interface Foo { color: string } // see #863'] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — multi-hash line: second hex in color context IS flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/foo.tsx': ['const tag = "#abc"; return <div style={{ color: "#def456" }} />;'] },
      expect: (hits) => hits.some((h) => h.signal === 'NEW-HEX-IN-D2C' && h.reason.includes('#def456')) },
    { name: 'NEW-HEX-IN-D2C — test file NOT flagged (cycle-4 bsuite#879)', framework: 'vite-react', repoName: 'bsuite',
      addedByFile: { 'packages/page-builder/src/__tests__/cascade.test.ts': ["  expect(style.color).toBe('#111111');"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — .test.tsx file NOT flagged', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/components/Foo.test.tsx': ["  render(<div style={{ color: '#ff0000' }} />);"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — .stories.tsx NOT flagged (Storybook fixture)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/components/Button.stories.tsx': ["  args: { style: { background: '#2563eb' } },"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'NEW-HEX-IN-D2C — /e2e/ path NOT flagged (Playwright)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'e2e/visual.spec.ts': ["  await expect(el).toHaveCSS('color', '#ff0000');"] },
      expect: (hits) => hits.every((h) => h.signal !== 'NEW-HEX-IN-D2C') },
    { name: 'AS-ANY-CAST — still flagged in test file (exemption is NEW-HEX only)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/lib/foo.test.ts': ['  const x = bar as any;'] },
      expect: (hits) => hits.some((h) => h.signal === 'AS-ANY-CAST') },
    { name: 'CLEAN — no drift', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'src/pages/home.tsx': ['export function Home() { return <div>hi</div>; }'] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — drift-scan.mjs own source NOT flagged', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'scripts/drift-scan.mjs': [
        "const WORD_COOKIE_STORAGE = /\\bcookieStorage\\b/;",
        "const STORAGE_KEY_LEGACY = /storageKey\\s*:\\s*[\"']business_suite_auth[\"']/;",
        "      addedByFile: { 'src/lib/ai.ts': [\"  model: 'xai/grok-4.1-fast-reasoning',\"] },",
        "      addedByFile: { 'src/lib/supabase.ts': [\"  auth: { flowType: 'implicit' }\"] },",
        "      addedByFile: { 'src/pages/foo.tsx': ['<div className=\"flex-shrink-0\">foo</div>'] },",
      ] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — pr-drift-scan.yml NOT flagged', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { '.github/workflows/pr-drift-scan.yml': ["name: PR Drift Scan", "  run: node scripts/drift-scan.mjs --self-test"] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — sibling check-no-cookie-sso.mjs NOT flagged (contains cookieStorage by design)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'scripts/check-no-cookie-sso.mjs': [
        "const FORBIDDEN = ['cookieStorage', 'createCookieStorage', \"domain: '.crm7.app'\", \"storageKey: 'business_suite_auth'\"];",
      ] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — check-tailwind-v4.mjs NOT flagged (contains flex-shrink-0 by design)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'scripts/check-tailwind-v4.mjs': ["const LEGACY = ['flex-shrink-0', 'flex-grow-0'];"] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — future check-foo.mjs NOT flagged (prefix-match futureproof)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'scripts/check-foo.mjs': ["const patterns = ['grok-4.1-fast-reasoning'];"] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — non-check script IS still scanned (not blanket-exempting scripts/)', framework: 'vite-react', repoName: 'crm7',
      addedByFile: { 'scripts/migrate-users.mjs': ["  auth: { flowType: 'implicit' }"] },
      expect: (hits) => hits.some((h) => h.signal === 'NON-PKCE-FLOW') },
    { name: 'SELF-SCAN — the conduit auth investigation doc NOT flagged (quotes the breach as evidence)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/20260427-conduit-auth-doctrine-investigation-v1.00W.md': [
        "src/lib/supabase/client.ts:22:        storageKey: 'business_suite_auth',",
      ] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — a DIFFERENT doc IS still scanned (exclusion is one file, not docs/)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/20260801-some-other-guide-v1.00W.md': [
        "        storageKey: 'business_suite_auth',",
      ] },
      expect: (hits) => hits.some((h) => h.signal === 'COOKIE-SSO') },
    // docs/recovered/ — the frozen archive of superseded requirements docs, tracked
    // 2026-08-08 under operator RULINGs 1.2/1.3. These four fixtures are the guard on
    // that exclusion: it must silence the archive WITHOUT becoming a docs/ escape
    // hatch. The archive necessarily names retired models and removed auth patterns
    // because it records what was decided in 2026-02/03.
    { name: 'SELF-SCAN — docs/recovered/ NOT flagged for a retired model (frozen archive)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/recovered/20260228-conduit-ai-tools-plan-v1.00F.md': [
        "| **Model** | `xai/grok-4.1-fast-reasoning` default |",
      ] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — docs/recovered/ NOT flagged for removed cookie SSO (frozen archive)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/recovered/20260301-phase1-coordination-plan-v1.00F.md': [
        "        storageKey: 'business_suite_auth',",
      ] },
      expect: (hits) => hits.length === 0 },
    { name: 'SELF-SCAN — a LIVE doc IS still flagged for the same retired model (archive exclusion is not a docs/ escape)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/20260808-some-live-guide-v1.00W.md': [
        "Use `xai/grok-4.1-fast-reasoning` as the default model.",
      ] },
      expect: (hits) => hits.some((h) => h.signal === 'STALE-GROK') },
    { name: 'SELF-SCAN — a path merely CONTAINING "recovered" is still scanned (prefix-anchored, not substring)', framework: 'unknown', repoName: 'bsuite',
      addedByFile: { 'docs/plans/recovered-work-plan-v1.00W.md': [
        "Use `xai/grok-4.1-fast-reasoning` as the default model.",
      ] },
      expect: (hits) => hits.some((h) => h.signal === 'STALE-GROK') },
  ];

  let pass = 0, fail = 0;
  for (const f of fixtures) {
    const hits = scan({ addedByFile: f.addedByFile, framework: f.framework, repoName: f.repoName });
    const ok = f.expect(hits);
    if (ok) { pass++; console.log(`  ✓ ${f.name}`); }
    else {
      fail++;
      console.error(`  ✗ ${f.name}`);
      console.error(`    hits: ${JSON.stringify(hits, null, 2)}`);
    }
  }
  console.log(`\nself-test: ${pass}/${pass + fail} passed`);
  if (fail > 0) process.exit(1);
}

// ─── Regex audit (enforces No-Regex-by-Default discipline) ────────────────

function regexAudit() {
  const MAX_LEN = 80;
  const regexes = [
    ['WORD_COOKIE_STORAGE', WORD_COOKIE_STORAGE],
    ['WORD_CREATE_COOKIE_STORAGE', WORD_CREATE_COOKIE_STORAGE],
    ['DOMAIN_CRM7_APP', DOMAIN_CRM7_APP],
    ['STORAGE_KEY_LEGACY', STORAGE_KEY_LEGACY],
    ['FLOWTYPE_IMPLICIT', FLOWTYPE_IMPLICIT],
    ['RESPONSE_TYPE_TOKEN', RESPONSE_TYPE_TOKEN],
    ['HEX_COLOR_NARROW', HEX_COLOR_NARROW],
    ['AS_ANY', AS_ANY],
    ['ENGINES_NODE_VALUE', ENGINES_NODE_VALUE],
    ['DIFF_GIT_HEADER', DIFF_GIT_HEADER],
  ];
  let fail = 0;
  for (const [name, re] of regexes) {
    const src = re.source;
    const len = src.length;
    console.log(`  ${name}: /${src}/ (${len} chars)`);
    if (len > MAX_LEN) {
      console.error(`    ✗ ${name} exceeds ${MAX_LEN} chars`);
      fail++;
    }
    // ReDoS smell: nested quantifiers like `(a+)+` or `(.*)*`.
    if (src.includes(')+') && (src.includes('+)') || src.includes('*)'))) {
      console.error(`    ✗ ${name} has a nested quantifier — potential ReDoS`);
      fail++;
    }
  }
  if (fail > 0) {
    console.error(`\nregex-audit FAILED: ${fail} issue(s)`);
    process.exit(1);
  }
  console.log(`\nregex-audit OK: ${regexes.length} regexes, all within discipline`);
}

// ─── Main ─────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') out.base = argv[++i];
    else if (a === '--head') out.head = argv[++i];
    else if (a === '--json') out.json = true;
    else if (a === '--full') out.full = true;
    else if (a === '--self-test') out.selfTest = true;
    else if (a === '--regex-audit') out.regexAudit = true;
    else if (a === '--diff-file') out.diffFile = argv[++i];
    else if (a === '--repo-name') out.repoNameOverride = argv[++i];
    else if (a === '--framework') out.frameworkOverride = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function printHelp() {
  console.log(`drift-scan.mjs — ${SIGNALS.length}-signal PR drift scanner

Usage:
  node scripts/drift-scan.mjs                   PR-diff scan vs origin/main merge-base
  node scripts/drift-scan.mjs --base X --head Y explicit range
  node scripts/drift-scan.mjs --full            scan full working tree
  node scripts/drift-scan.mjs --json            JSON output
  node scripts/drift-scan.mjs --self-test       run built-in fixtures
  node scripts/drift-scan.mjs --regex-audit     audit internal regex discipline
  node scripts/drift-scan.mjs --diff-file P     scan a pre-captured diff file
                       --repo-name N --framework F  (overrides for offline mode)
  node scripts/drift-scan.mjs --help            this help

Exit codes: 0 clean/warn-only · 1 hard-fail hit · 2 scanner error`);
}

async function main() {
  if (ARGS.help) { printHelp(); return; }
  if (ARGS.selfTest) { selfTest(); return; }
  if (ARGS.regexAudit) { regexAudit(); return; }

  const repoRoot = process.cwd();
  const framework = ARGS.frameworkOverride || detectFramework(repoRoot);
  const repoName = ARGS.repoNameOverride || detectRepoName(repoRoot);

  let addedByFile;
  if (ARGS.diffFile) {
    // Offline mode: scan a pre-captured diff file (e.g. `gh pr diff > pr.diff`).
    // Useful for cycle-N audits across many PRs without full repo checkouts.
    const diff = readFileSync(ARGS.diffFile, 'utf8');
    addedByFile = parseDiff(diff);
  } else if (ARGS.full) {
    const files = runGit('ls-files').split('\n').filter(Boolean);
    addedByFile = {};
    for (const f of files) {
      // Literal suffix check, no regex needed.
      const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.scss', '.json'];
      if (!exts.some((e) => f.endsWith(e))) continue;
      try {
        addedByFile[f] = readFileSync(path.join(repoRoot, f), 'utf8').split('\n');
      } catch {}
    }
  } else {
    const range = resolveDiffRange();
    const diff = getUnifiedDiff(range);
    addedByFile = parseDiff(diff);
  }

  const hits = scan({ addedByFile, framework, repoName });

  if (ARGS.json) {
    console.log(JSON.stringify({ framework, repoName, hits }, null, 2));
  } else {
    console.log(emitMarkdown(hits, framework, repoName));
  }

  const hardFails = hits.filter((h) => h.severity === 'fail');
  if (hardFails.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`drift-scan error: ${err.message}`);
  process.exit(2);
});
