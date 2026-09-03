#!/usr/bin/env node
/*
 * COOKIE SSO IS FORBIDDEN — in the code, and in what the docs CLAIM.
 *
 * Two passes, because the doctrine failed in two different ways.
 *
 * PASS 1 (source) is the original gate: no `cookieStorage`, no
 * `business_suite_auth`, no `domain=.crm7.app` in app source. That half has held.
 *
 * PASS 2 (docs) is new, 2026-09-03, and exists because the code being clean is not
 * the same as the estate SAYING it is clean. Four documents across
 * business-suite-unified and conduit listed "BS OAuth + cookie SSO" as a SHIPPED,
 * ALIGNED capability — one of them (conduit/docs/CONSISTENCY-REPORT.md) contradicted
 * itself eleven lines apart, recording "Cookie-SSO carve-out fully retired ✅" in its
 * table and "BS OAuth + cookie SSO ✅" in its aligned list. `AUTH_CANONICAL.md` is
 * emphatic in the other direction ("DO NOT REVERT TO COOKIE SSO", effective
 * 2025-02-27) and says in terms that conduit "was previously documented as
 * 'delegated UI / cookie SSO only' — that was incorrect."
 *
 * Nothing could catch that. Pass 1 only reads `*/ /* src` with code extensions. The
 * PR drift scanner's COOKIE-SSO signal is AST-based and diff-scoped — excellent at
 * stopping a NEW cookieStorage line, structurally unable to see a doc that has said
 * the wrong thing for four months. So the estate's most emphatic security doctrine
 * was contradicted, in writing, by its own documentation, indefinitely.
 *
 * WHY A DOC CLAIM IS A REAL DEFECT AND NOT PEDANTRY. The next agent to touch auth
 * reads the docs first. A doc saying cookie SSO is shipped is an instruction to
 * reintroduce it, and `AUTH_CANONICAL.md` anticipates exactly that reader: "If any
 * code, test, comment, doc, or AI agent suggests reintroducing cookieStorage ... that
 * suggestion is wrong."
 *
 * WHAT PASS 2 DOES NOT FLAG. Docs must be able to discuss the forbidden thing — that
 * is how a prohibition gets written down. A line trips only when it names cookie SSO
 * AND asserts it as a current capability (a tick, "shipped", "aligned", "wired") AND
 * carries no negation ("no", "not", "removed", "forbidden", ...) AND is not visibly
 * talking ABOUT the defect ("stale", "describes", "previously"). On top of that:
 *
 *   - a file whose frontmatter carries `verdict: superseded` is skipped outright.
 *     Those are preserved historical records under the estate's G5 verdict banners;
 *     a record that gets quietly corrected stops being a record.
 *   - a `cookie-sso-audit-ok` marker on the line, or the line immediately above,
 *     suppresses it. Same semantics as drift-scan.mjs's `theme-audit-ok`
 *     (eslint-disable-next-line convention) — deliberately the same convention
 *     rather than a third one.
 *
 * REFUSING AN EMPTY TREE. The original silently swallowed ENOENT on a missing root,
 * so an uninitialised submodule scanned nothing, found nothing and exited 0 — the
 * estate's most-repeated failure class (see scripts/check-submodule-scan-guards.mjs).
 * Missing roots are now fatal, and every clean pass states how much it examined.
 *
 * `.claude/` and `worktrees/` are excluded by construction: agent worktrees are full
 * copies of the estate that appear and vanish mid-session. A local run over them
 * moved this scanner's own denominator 2020 -> 2400 -> 2780 inside ten minutes.
 *
 * Usage:  node scripts/check-no-cookie-sso.mjs [--self-test]
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

const sourceRoots = [
  'R80.4/src',
  'braden/src',
  'business-suite-unified/src',
  'conduit/src',
  'crm7/src',
  'throughput/src',
  'packages/auth/src',
  'packages/nav-core/src',
];

// Where the estate writes down what it believes. The root `.` entry is
// non-recursive on purpose — it picks up AUTH_CANONICAL.md, CLAUDE.md and AGENTS.md
// without re-walking every submodule from the top.
const docRoots = [
  'docs',
  'braden/docs',
  'business-suite-unified/docs',
  'conduit/docs',
  'crm7/docs',
  'throughput/docs',
  'R80.4/docs',
];

const forbidden = [
  { label: 'cookieStorage', pattern: /\bcookieStorage\b/ },
  { label: 'createCookieStorage', pattern: /\bcreateCookieStorage\b/ },
  { label: 'business_suite_auth', pattern: /business_suite_auth/ },
  { label: 'domain=.crm7.app', pattern: /domain\s*[:=]\s*['"]\.crm7\.app['"]|domain=.crm7.app/ },
  { label: 'shared Supabase storageKey', pattern: /storageKey\s*:\s*['"]business_suite_auth['"]/ },
];

const exts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set([
  'node_modules', 'dist', 'build', '.next', 'coverage', '.turbo', '.git',
  // Agent worktrees are whole copies of the estate. Scanning them double-counts
  // every file and makes the denominator depend on what else is running.
  '.claude', 'worktrees',
]);

const DOC_AUDIT_OK_MARKER = 'cookie-sso-audit-ok';

// Regex is confined to word-boundary and case-insensitive matching, which
// String.includes cannot express — the same exception this estate's other lint
// tooling declares (see drift-scan.mjs header).
const DOC_MENTION = /cookie[\s_-]?sso|cookieStorage|business_suite_auth/i;
const DOC_AFFIRMS = /✅|\bshipped\b|\baligned\b|\bsupported\b|\benabled\b|\bin use\b|\bwired\b/i;
const DOC_NEGATES = /\bno\b|\bnot\b|\bnever\b|\bmust not\b|\bforbidden\b|\bdeprecated\b|\bbanned\b|\bno longer\b|\bremoved\b|\bretired\b|\bgone\b|\babandoned\b|\babsent\b|\bwrong\b|\bregression\b|\bwithout\b/i;
// A line that is visibly ABOUT the defect — a register row, an inventory entry, an
// audit finding — is reporting it, not asserting it.
const DOC_META = /\bstale\b|\bdescrib\w*|\bincorrect\b|\bstill\b|\bpreviously\b|\bwas\b|\bhistor\w*|\bclaim\w*/i;

/** Frontmatter `verdict: superseded` marks a preserved historical record. */
function isSupersededRecord(content) {
  if (!content.startsWith('---')) return false;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return false;
  return /^verdict:\s*superseded\s*$/m.test(content.slice(0, end));
}

/** drift-scan.mjs's `theme-audit-ok` semantics: this line, or the one above it. */
function hasDocAuditOk(lines, index) {
  if (lines[index].includes(DOC_AUDIT_OK_MARKER)) return true;
  if (index === 0) return false;
  return lines[index - 1].includes(DOC_AUDIT_OK_MARKER);
}

export function docLineIsForbiddenClaim(line) {
  return (
    DOC_MENTION.test(line) &&
    DOC_AFFIRMS.test(line) &&
    !DOC_NEGATES.test(line) &&
    !DOC_META.test(line)
  );
}

/*
 * THE BANK — three doc claims that are ALREADY FIXED on app branches, and which CI
 * still sees because the parent records each submodule at a PINNED COMMIT (a
 * "gitlink"), not at the app's branch tip. Both gitlinks here track each app's MAIN,
 * so a fix reaches the parent only after feature -> development -> main -> pointer
 * advance. Blocking this gate until that whole chain completes would mean the estate's
 * loudest security doctrine stays ungated for the duration, which is the worse trade.
 *
 * Banked BY IDENTITY, never by count. A bare number lets a DIFFERENT violation hide
 * behind it; matching on the file and the offending text cannot.
 */
const BANKED_DOC_CLAIMS = [
  {
    file: 'conduit/docs/CONSISTENCY-REPORT.md',
    contains: '- BS OAuth + cookie SSO',
    fixedBy: 'conduit#676',
  },
  {
    file: 'conduit/docs/UNIFIED-ROADMAP.md',
    contains: '`@bsuite/auth` consumer (BS OAuth + cookie SSO)',
    fixedBy: 'conduit#676',
  },
];

/*
 * A BANK IS ONLY TRUE FOR ONE GITLINK, and this gate runs in two places that disagree.
 *
 * In CI the submodule is checked out AT the recorded pointer, so a banked entry that
 * produces no finding really is stale and must be removed — the half of a ratchet that
 * stops fixed work sitting banked forever.
 *
 * In a developer tree the submodule sits on a branch AHEAD of the pointer, so the same
 * silence means "already fixed locally, pointer not advanced yet" — which is the normal,
 * correct state and must not fail. Telling the two apart is a measurement, not a guess:
 * compare the recorded gitlink against the submodule's actual HEAD.
 */
function submoduleTreeMatchesGitlink(mod) {
  try {
    const recorded = execFileSync('git', ['ls-tree', 'HEAD', mod], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split(/\s+/)[2];
    const actual = execFileSync('git', ['-C', mod, 'rev-parse', 'HEAD'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!recorded || !actual) return null;
    return recorded === actual;
  } catch {
    return null; // cannot tell — treated as "do not fail on staleness"
  }
}

const hits = [];
const bankedSeen = new Set();
const missingRoots = [];
let sourceFilesScanned = 0;
let docFilesScanned = 0;

async function walk(dir, onFile) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error?.code === 'ENOENT') {
      missingRoots.push(path.relative(root, dir));
      return;
    }
    throw error;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await walk(full, onFile);
      continue;
    }
    if (!entry.isFile()) continue;
    await onFile(full, path.relative(root, full));
  }
}

async function scanSourceFile(full, relative) {
  if (!exts.has(path.extname(full))) return;
  // The per-app CI-enforced oauth-contract suites assert these tokens are
  // ABSENT from app source, so the test files necessarily contain the
  // literals. They are the guard, not a violation.
  if (path.basename(full) === 'oauth-contract.test.ts') return;
  sourceFilesScanned += 1;
  const content = await readFile(full, 'utf8');
  content.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
    // A line that FORBIDS the pattern is not an implementation of it.
    //
    // This gate already skips oauth-contract.test.ts for the same reason its own
    // comment gives: "the test files necessarily contain the literals. They are the
    // guard, not a violation." That is one instance of a general shape, and here is
    // the second — business-suite-unified/src/lib/manuals/blocks/shared.ts:88 is
    // MANUAL PROSE that reads:
    //
    //   'Redirect URIs are exact-match `{origin}/auth/callback`; never add
    //    `cookieStorage` or `domain=.crm7.app`.'
    //
    // The security gate was failing on the sentence that forbids the thing. A
    // security gate that cries wolf on its own documentation gets ignored, and then
    // a real cookieStorage walks past it.
    //
    // Narrow on purpose: the prohibition word must be on the SAME line, so an actual
    // config line cannot be excused by a "never" elsewhere in the file. It also
    // catches trailing comments, which the full-line check above does not.
    if (/\b(never|do not|don't|must not|forbidden|deprecated|banned|no longer)\b/i.test(line)) return;
    forbidden.forEach(({ label, pattern }) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        hits.push(`${relative}:${index + 1}: forbidden ${label}`);
      }
    });
  });
}

async function scanDocFile(full, relative) {
  if (path.extname(full) !== '.md') return;
  const content = await readFile(full, 'utf8');
  docFilesScanned += 1;
  if (isSupersededRecord(content)) return;
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!docLineIsForbiddenClaim(line)) return;
    if (hasDocAuditOk(lines, index)) return;
    const banked = BANKED_DOC_CLAIMS.find(
      (b) => b.file === relative && line.includes(b.contains),
    );
    if (banked) {
      bankedSeen.add(`${banked.file}::${banked.contains}`);
      return;
    }
    hits.push(
      `${relative}:${index + 1}: doc claims cookie SSO is a current capability — ` +
        `${line.trim().slice(0, 120)}`,
    );
  });
}

async function selfTest() {
  const cases = [
    // [line, shouldFlag, why]
    ['- BS OAuth + cookie SSO ✅', true, 'the exact conduit/BSU defect'],
    ['| `@bsuite/auth` consumer (BS OAuth + cookie SSO) | ✅ shipped |', true, 'roadmap row'],
    ['- ✅ `cookieStorage` — Wired to Supabase client for cross-subdomain auth', true, 'wired claim'],
    ['- BS OAuth (PKCE only, no cookie SSO due to `.com.au` TLD) ✅', false, '"no" negates'],
    ['| App | ... | Forbidden cookie SSO |', false, '"Forbidden" negates'],
    ['- BS OAuth 2.1 PKCE + JWKS ✅ — cookie SSO **removed 2025-02-27**', false, '"removed" negates'],
    ['Stale "App Router co-existence with cookie SSO"; EntitySelector ❌ accurate', false, '"Stale" is meta'],
    ['four documents across BSU and conduit still describe cookie SSO as shipped', false, 'describes the defect'],
    ['The cookie SSO scheme was deprecated 2025-02-27 in favour of BS OAuth', false, 'no affirmation'],
    ['- TanStack Query 5.99.0 ✅', false, 'unrelated aligned row'],
  ];
  let failed = 0;
  for (const [line, expected, why] of cases) {
    const got = docLineIsForbiddenClaim(line);
    if (got !== expected) {
      failed += 1;
      console.error(`  FAIL (${why}): expected ${expected}, got ${got}\n        ${line}`);
    }
  }

  // Suppression semantics, asserted separately from the classifier.
  const suppression = [
    [['a', `- BS OAuth + cookie SSO ✅ <!-- ${DOC_AUDIT_OK_MARKER} -->`], 1, true, 'same-line marker'],
    [[`<!-- ${DOC_AUDIT_OK_MARKER} -->`, '- BS OAuth + cookie SSO ✅'], 1, true, 'line-above marker'],
    [[`<!-- ${DOC_AUDIT_OK_MARKER} -->`, 'filler', '- BS OAuth + cookie SSO ✅'], 2, false, 'two lines above does NOT suppress'],
  ];
  for (const [lines, index, expected, why] of suppression) {
    const got = hasDocAuditOk(lines, index);
    if (got !== expected) {
      failed += 1;
      console.error(`  FAIL (${why}): expected ${expected}, got ${got}`);
    }
  }

  const superseded = [
    ['---\nkind: record\nverdict: superseded\n---\n\n- cookie SSO ✅', true, 'frontmatter verdict'],
    ['---\nkind: record\nauthority: none\n---\n\n- cookie SSO ✅', false, 'authority:none is NOT a verdict'],
    ['# Doc\n\nverdict: superseded\n', false, 'not in frontmatter'],
  ];
  for (const [content, expected, why] of superseded) {
    const got = isSupersededRecord(content);
    if (got !== expected) {
      failed += 1;
      console.error(`  FAIL (${why}): expected ${expected}, got ${got}`);
    }
  }

  const total = cases.length + suppression.length + superseded.length;
  if (failed > 0) {
    console.error(`self-test: ${failed} of ${total} assertions FAILED.`);
    process.exit(1);
  }
  console.log(`self-test: ${total} assertions passed.`);
  process.exit(0);
}

if (process.argv.includes('--self-test')) {
  await selfTest();
}

await Promise.all(sourceRoots.map((item) => walk(path.join(root, item), scanSourceFile)));
await Promise.all(docRoots.map((item) => walk(path.join(root, item), scanDocFile)));

// Root-level canon (AUTH_CANONICAL.md, CLAUDE.md, AGENTS.md, README.md), non-recursive.
for (const name of ['AUTH_CANONICAL.md', 'CLAUDE.md', 'AGENTS.md', 'README.md']) {
  try {
    await scanDocFile(path.join(root, name), name);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

// An uninitialised submodule is an empty directory. A scan over it finds nothing and
// would otherwise exit 0 — a PASS over zero coverage, which is worse than a failure
// because nothing draws the eye to it. Refuse instead.
if (missingRoots.length > 0) {
  console.error(
    'REFUSING TO REPORT: these roots are missing, so this scan covered less than the estate.',
  );
  console.error(missingRoots.map((r) => `  missing: ${r}`).join('\n'));
  console.error('Check out the submodules (scripts/assert-app-trees-present.sh) and re-run.');
  process.exit(2);
}

// The ratchet's other half: a banked finding that no longer occurs must LEAVE the
// bank, or fixed work sits banked forever and the number stops meaning anything.
// Only enforced where the check is meaningful — see submoduleTreeMatchesGitlink.
const staleBank = BANKED_DOC_CLAIMS.filter(
  (b) => !bankedSeen.has(`${b.file}::${b.contains}`),
);
const enforceableStale = [];
const notYetPointed = [];
for (const b of staleBank) {
  const mod = b.file.split('/')[0];
  const matches = submoduleTreeMatchesGitlink(mod);
  if (matches === true) enforceableStale.push(b);
  else notYetPointed.push({ ...b, mod });
}

if (notYetPointed.length > 0) {
  console.log(
    `Bank: ${notYetPointed.length} entr(y/ies) already fixed in a submodule working tree ` +
      'that is AHEAD of the recorded pointer. Not stale yet — they clear when the pointer advances:',
  );
  for (const b of notYetPointed) {
    console.log(`  pending pointer advance: ${b.file} (fixed by ${b.fixedBy})`);
  }
}

if (enforceableStale.length > 0) {
  console.error(
    'STALE BANK: these entries no longer occur at the recorded pointer, so the bank is ' +
      'holding fixed work. Delete them from BANKED_DOC_CLAIMS in this file.',
  );
  console.error(
    enforceableStale.map((b) => `  stale: ${b.file} (fixed by ${b.fixedBy})`).join('\n'),
  );
  process.exit(1);
}

if (hits.length > 0) {
  console.error(
    'Cookie SSO is forbidden in code AND in what the docs claim. Use BS OAuth 2.1 PKCE + JWKS only.',
  );
  console.error('Authority: AUTH_CANONICAL.md ("DO NOT REVERT TO COOKIE SSO", effective 2025-02-27).');
  console.error(hits.join('\n'));
  console.error(
    `\nExamined ${sourceFilesScanned} source files across ${sourceRoots.length} roots and ` +
      `${docFilesScanned} markdown files across ${docRoots.length} doc roots.`,
  );
  process.exit(1);
}

console.log(
  `Examined ${sourceFilesScanned} source files across ${sourceRoots.length} source roots and ` +
    `${docFilesScanned} markdown files across ${docRoots.length} doc roots. ` +
    'No forbidden cookie SSO patterns, and no NEW document claims cookie SSO is a current ' +
    `capability. ${bankedSeen.size} of ${BANKED_DOC_CLAIMS.length} banked claim(s) still present ` +
    'at the recorded submodule pointers; the bank may only shrink.',
);
