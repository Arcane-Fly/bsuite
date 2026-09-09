#!/usr/bin/env node
/**
 * scripts/check-review-citations.mjs
 *
 * Before an external review is triaged, every path it cites must resolve.
 * A review that cannot produce a file is not a review.
 *
 * WHY THIS EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-08-20 an external review agent (Qodo) produced eight "ready to be
 * used by AI coding agents" prompts against this repo. Every file path it cited
 * was absent from the machine. It had matched DeepMind's `bsuite` - Behaviour
 * Suite for Reinforcement Learning, an unrelated Python RL benchmark that
 * shares only the name - and written the findings as though measured, complete
 * with line numbers and quoted code:
 *
 *     bsuite/bsuite/logging/csv_logging.py   lines 52-61
 *     bsuite/bsuite/logging/sqlite_logging.py lines 66-79
 *     bsuite/setup.py                         "declares Python 3.6 and 3.7"
 *
 * A machine-wide `find /` for those filenames returns zero hits, and
 * `git log --all --diff-filter=A` shows none was ever added on any ref.
 *
 * The cost was nearly severe. PROMPT 6 instructed an agent to "remove
 * packages/* from pnpm-workspace.yaml and remove the empty packages
 * directory". `packages/` holds 17 shared packages, 7 of them published to npm
 * and consumed by all six apps. An obedient agent executing that prompt deletes
 * the shared-package tree and breaks every build. PROMPT 5 would have stood up
 * a second test framework alongside the 1,683 existing Vitest tests, on the
 * stated grounds that "no test infrastructure [is] in place".
 *
 * One check would have voided all eight at zero cost: do the cited paths exist?
 *
 * THE ASYMMETRY THIS CORRECTS
 * ---------------------------------------------------------------------------
 * Line numbers and quoted code are the most trust-inducing thing a review can
 * show and the cheapest thing to invent. They should RAISE the evidentiary bar,
 * not lower it. This script makes citation a checkable claim rather than a
 * credential.
 *
 * WHAT IT DOES NOT DO
 * ---------------------------------------------------------------------------
 * It does not judge whether a finding is correct - only whether the thing it
 * points at exists. A review can cite every path perfectly and still be wrong
 * about all of them. Passing here means "worth reading", never "true".
 *
 * It is deliberately NOT in guard-registry.mjs. LANE-WATCHER runs guards
 * against repo state on a schedule; this needs a review as input. Registering
 * it would mean inventing a fixture review for it to pass against every run,
 * which is the vacuous-pass shape the registry exists to catch.
 *
 * USAGE
 *   node scripts/check-review-citations.mjs <review-file> [--root <dir>]
 *   cat review.md | node scripts/check-review-citations.mjs --root .
 *
 * Exit 0 = every citation resolves.
 * Exit 1 = at least one does not, or nothing citation-like was found.
 */

import { basename, dirname, join } from 'node:path';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  mkdtempSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SOURCE_EXT = '(?:tsx|jsx|ts|js|mjs|cjs|py|sql|json|ya?ml|md|sh|toml|css|html|rs|go|java|rb)';

/** Full-extension boundary: avoid truncating `.tsx` to `.ts` / `.jsx` to `.js`
 * and avoid matching `.tsx.bak` as `.ts` while still allowing line/column
 * suffixes and punctuation immediately after a citation.
 */
const EXTEND = '(?::(\\d+)(?::(\\d+))?)?(?![A-Za-z0-9_./-])';

/**
 * A citation is a slash-bearing path ending in a known source extension,
 * optionally followed by :line or :line:col. Requiring the slash keeps bare
 * filenames mentioned in prose ("see package.json") out of the set - those are
 * references, not citations, and flagging them would train people to ignore
 * this check.
 */
const CITATION = new RegExp(
  // Built by concatenation, not a template literal: an earlier version used
  // String.raw with a ${EXT} placeholder and .replace(), forgetting that
  // String.raw suppresses escape processing but NOT interpolation. It threw
  // "EXT is not defined" at import, which made the two must-FAIL controls exit
  // 1 for the wrong reason and look like passes. Only the must-PASS control
  // exposed it — which is why this file keeps one.
  '(?:^|[\\s(\\[<"\'`])' + // left boundary
    '((?:[\\w.@~-]+\\/)+[\\w.@-]+\\.' + // dir segments + filename
    SOURCE_EXT +
    ')' +
    EXTEND, // optional :line, optional :col, and hard extension boundary
  'g',
);
const SELF = fileURLToPath(import.meta.url);

/** Noise that looks like a repo path but never is. */
const IGNORED_PREFIXES = [
  'http://',
  'https://',
  'node_modules/',
  '/nix/store/',
  '/usr/',
  '/etc/',
  '/proc/',
];

function parseArgs(argv) {
  const args = { file: null, root: '.' };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root') {
      args.root = argv[i + 1];
      i += 1;
    } else if (!args.file) {
      args.file = argv[i];
    }
  }
  return args;
}

function readInput(file) {
  if (file) {
    if (!existsSync(file)) {
      console.error(`FAIL: review file not found: ${file}`);
      process.exit(1);
    }
    return readFileSync(file, 'utf8');
  }
  try {
    return readFileSync(0, 'utf8');
  } catch {
    console.error('FAIL: no review file given and nothing on stdin.');
    process.exit(1);
  }
}

/** Directories one level down that are plausible path prefixes (submodules). */
function candidateRoots(root) {
  const roots = [root];
  let entries = [];
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch {
    return roots;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    roots.push(join(root, e.name));
  }
  return roots;
}

/** Is there a file with this basename anywhere shallow in the tree? */
function basenameExistsNearby(root, name, depth = 4) {
  const stack = [{ dir: root, d: 0 }];
  while (stack.length) {
    const { dir, d } = stack.pop();
    if (d > depth) continue;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
        stack.push({ dir: join(dir, e.name), d: d + 1 });
      } else if (e.name === name) {
        return join(dir, e.name);
      }
    }
  }
  return null;
}

function main() {
  const { file, root } = parseArgs(process.argv.slice(2));

  if (!existsSync(root)) {
    console.error(`FAIL: --root ${root} does not exist.`);
    process.exit(1);
  }

  const text = readInput(file);
  const roots = candidateRoots(root);

  const seen = new Map(); // path -> { line, col }
  for (const m of text.matchAll(CITATION)) {
    const p = m[1];
    if (IGNORED_PREFIXES.some((pre) => p.startsWith(pre))) continue;
    if (!seen.has(p)) seen.set(p, { line: m[2] ?? null, col: m[3] ?? null });
  }

  if (seen.size === 0) {
    console.error(
      'FAIL: no file citations found in this review.\n' +
        '  A review that names no file cannot be checked, and cannot be acted on\n' +
        '  either. Ask the reviewer for paths before triaging any of it.',
    );
    process.exit(1);
  }

  const resolved = [];
  const missing = [];

  for (const [p] of seen) {
    // Try the path verbatim, then under each candidate root (submodules), then
    // with a leading segment stripped (reviews often prefix the repo name).
    const attempts = [];
    for (const r of roots) attempts.push(join(r, p));
    const stripped = p.split('/').slice(1).join('/');
    if (stripped) for (const r of roots) attempts.push(join(r, stripped));

    const hit = attempts.find((a) => {
      try {
        return statSync(a).isFile();
      } catch {
        return false;
      }
    });

    if (hit) {
      resolved.push(p);
    } else {
      const near = basenameExistsNearby(root, basename(p));
      missing.push({ path: p, near });
    }
  }

  console.log(
    `  citations found ${seen.size}   resolved ${resolved.length}   unresolved ${missing.length}`,
  );

  if (missing.length > 0) {
    console.error('');
    console.error(
      `FAIL: ${missing.length} of ${seen.size} cited path(s) do not exist in this repo.`,
    );
    for (const { path: p, near } of missing) {
      console.error(
        `  ${p}` +
          (near
            ? `\n      a file of that name does exist at ${near} — the citation may be mis-rooted rather than invented`
            : `\n      no file of that name exists anywhere in the tree`),
      );
    }
    console.error(
      '\nDo not triage this review until the paths resolve. Line numbers and\n' +
        'quoted code are the cheapest things to invent and the most convincing\n' +
        'things to read; treat them as claims, not credentials.\n' +
        'See bsuite#2201 for the incident that motivated this check.',
    );
    process.exit(1);
  }

  console.log(
    `ok — all ${resolved.length} cited path(s) resolve under ${root}. ` +
      `This says the review is worth reading; it does not say it is right.`,
  );
}

function runFixtureReview(reviewFile, root) {
  try {
    const out = execFileSync(process.execPath, [SELF, reviewFile, '--root', root], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (e) {
    return {
      code: e.status ?? 1,
      out: `${e.stdout || ''}${e.stderr || ''}`,
    };
  }
}

function selfTest() {
  const testCount = 2;
  const fixture = mkdtempSync(join(tmpdir(), 'check-review-citations-selftest-'));
  const reviewFile = join(fixture, 'review.md');

  const write = (rel, content) => {
    const target = join(fixture, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, `${content}\n`);
  };

  let bad = 0;
  const check = (name, ok) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${name}`);
    if (!ok) bad += 1;
  };

  try {
    write('crm7/src/components/common/DocumentEditor/index.tsx', '// exists');
    write('crm7/src/pages/documents/templates/editor.jsx', '// exists');
    write('crm7/src/services/builder.mjs', '// exists');
    write('crm7/src/pages/bad.ts', '// sibling for truncation bait');
    write('review.md', [
      '- `crm7/src/components/common/DocumentEditor/index.tsx:42:7`',
      '- `crm7/src/pages/documents/templates/editor.jsx` (parentheses)',
      '- `crm7/src/services/builder.mjs`',
      '- `crm7/src/pages/bad.tsx.bak`',
    ].join('\n'));

    const clean = runFixtureReview(reviewFile, fixture);
    const cleanFound = clean.out.match(/citations found (\d+)\s+ resolved (\d+)\s+ unresolved (\d+)/);
    check(
      'clean fixture passes with .tsx/.jsx/.mjs and ignores unsupported .tsx.bak',
      clean.code === 0 &&
        cleanFound !== null &&
        Number(cleanFound[1]) === 3 &&
        Number(cleanFound[2]) === 3 &&
        Number(cleanFound[3]) === 0,
    );

    write('review.md', [
      '- `crm7/src/components/common/DocumentEditor/index.tsx`',
      '- `crm7/src/pages/documents/templates/editor.jsx`',
      '- `crm7/src/services/builder.mjs`',
      '- `crm7/src/pages/missing.tsx`',
      '- `crm7/src/pages/bad.tsx.bak`',
    ].join('\n'));

    const fail = runFixtureReview(reviewFile, fixture);
    check(
      'fixture with missing path exits non-zero',
      fail.code !== 0 &&
        fail.out.includes('FAIL: 1 of 4 cited path(s) do not exist in this repo.') &&
        fail.out.includes('crm7/src/pages/missing.tsx'),
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }

  const ok = testCount - bad;
  console.log(`\n  ${ok}/${testCount} review self-test(s) passed`);
  process.exit(bad === 0 ? 0 : 1);
}

if (process.argv.includes('--self-test')) {
  selfTest();
} else {
  main();
}
