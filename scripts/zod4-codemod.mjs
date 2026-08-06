#!/usr/bin/env node
/**
 * zod4-codemod.mjs — Zod 4 top-level format function migration
 *
 * Replaces deprecated `z.string().format()` chains with Zod 4 top-level
 * equivalents across all 6 BSuite apps and packages.
 *
 * Zod 4 introduced standalone format validators that are faster and produce
 * better error messages than the legacy string-chained forms.
 *
 * Transformations performed:
 *   z.string().email()      → z.email()
 *   z.string().uuid()       → z.uuid()
 *   z.string().url()        → z.url()
 *   z.string().cuid()       → z.cuid()
 *   z.string().cuid2()      → z.cuid2()
 *   z.string().ulid()       → z.ulid()
 *   z.string().datetime()   → z.datetime()
 *   z.string().ip()         → z.ip()
 *
 * Chained modifiers are preserved:
 *   z.string().email().min(5)      → z.email().min(5)
 *   z.string().uuid().nullable()   → z.uuid().nullable()
 *   z.string().url().optional()    → z.url().optional()
 *
 * NOT touched:
 *   z.string().min()/.max()/.regex()   (not format functions)
 *   Custom .refine() business rules    (domain logic, not format)
 *
 * Usage:
 *   node scripts/zod4-codemod.mjs [--dry-run] [path1] [path2] ...
 *
 *   If no paths are given, defaults to all in-scope source directories.
 *
 * Options:
 *   --dry-run   Print what would change without writing files.
 *
 * @see https://zod.dev/v4 for Zod 4 top-level format functions
 * @see AGENTS.md §4 — "Zod 4.4.3 locked across all 6 apps"
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..');

// ─── Format function mapping ────────────────────────────────────────────────

/**
 * Each entry is a format function name. The regex matches:
 *   z.string().<name>(...)
 * and replaces with:
 *   z.<name>(...)
 *
 * The trailing parentheses group is preserved so chained calls
 * (e.g. .min(5), .nullable(), .optional()) remain intact.
 */
const FORMAT_FUNCTIONS = [
  'email',
  'uuid',
  'url',
  'cuid2', // cuid2 before cuid so cuid2 doesn't partially match
  'cuid',
  'ulid',
  'datetime',
  'ip',
];

/**
 * Replacement regex — built once at module initialisation.
 *
 * Pattern explanation:
 *   z\.string\(\)\.    — literal `z.string().`
 *   (email|uuid|...)   — one of the format function names (longest first to
 *                        prevent partial matches, e.g. cuid2 before cuid)
 *   \(                 — opening paren of the format call
 *
 * We replace the whole match `z.string().<fn>(` with `z.<fn>(`.
 * The rest of the call (arguments, closing paren, chained methods) is
 * unaffected because we stop at the opening paren.
 */
const REPLACEMENT_REGEX = (() => {
  const sorted = [...FORMAT_FUNCTIONS].sort((a, b) => b.length - a.length);
  return new RegExp(`z\\.string\\(\\)\\.(${sorted.join('|')})\\(`, 'g');
})();

/**
 * Apply the codemod to the content of a single file.
 * Returns `{ changed: boolean, content: string, count: number }`.
 */
function applyCodemod(source) {
  let count = 0;
  const result = source.replace(REPLACEMENT_REGEX, (match, fnName) => {
    count++;
    return `z.${fnName}(`;
  });
  return { changed: count > 0, content: result, count };
}

// ─── File system traversal ──────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.ts', '.tsx']);

/** Skip test helper files that deliberately test legacy patterns. */
const SKIP_FILENAME_PATTERNS = [
  /zod4-codemod/, // this script itself
];

function shouldSkipFile(filePath) {
  return SKIP_FILENAME_PATTERNS.some((p) => p.test(filePath));
}

function walk(dir, results = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry === 'dist' || entry === '.git') continue;
    const full = join(dir, entry);
    let stat;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walk(full, results);
    } else if (SUPPORTED_EXTENSIONS.has(extname(entry))) {
      results.push(full);
    }
  }
  return results;
}

// ─── Default scan targets ───────────────────────────────────────────────────

const DEFAULT_TARGETS = [
  // Sub-repos (populated when submodules are checked out)
  join(REPO_ROOT, 'crm7', 'src'),
  join(REPO_ROOT, 'R80.4', 'src'),
  join(REPO_ROOT, 'braden', 'src'),
  join(REPO_ROOT, 'business-suite-unified', 'src'),
  join(REPO_ROOT, 'conduit', 'src'),
  join(REPO_ROOT, 'throughput', 'src'),
  // Monorepo packages (always present)
  join(REPO_ROOT, 'packages', 'auth', 'src'),
  join(REPO_ROOT, 'packages', 'charge-calc', 'src'),
  join(REPO_ROOT, 'packages', 'data-export', 'src'),
  join(REPO_ROOT, 'packages', 'dates', 'src'),
  join(REPO_ROOT, 'packages', 'dry-lint', 'src'),
  join(REPO_ROOT, 'packages', 'eslint-config'),
  join(REPO_ROOT, 'packages', 'nav-core', 'src'),
  join(REPO_ROOT, 'packages', 'page-builder', 'src'),
  join(REPO_ROOT, 'packages', 'schema-builder', 'src'),
  join(REPO_ROOT, 'packages', 'schema-registry', 'src'),
  join(REPO_ROOT, 'packages', 'theme', 'src'),
  join(REPO_ROOT, 'packages', 'ui', 'src'),
];

// ─── CLI entry-point ────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const paths = args.filter((a) => !a.startsWith('--'));

  const targets = paths.length > 0 ? paths : DEFAULT_TARGETS;

  let totalFiles = 0;
  let totalChangedFiles = 0;
  let totalReplacements = 0;

  /** Per-target stats for the summary table. */
  const stats = [];

  for (const target of targets) {
    let stat;
    try {
      stat = statSync(target);
    } catch {
      // Target directory doesn't exist (e.g. unchecked-out submodule)
      continue;
    }

    const files = stat.isDirectory() ? walk(target) : [target];
    let targetChanged = 0;
    let targetReplacements = 0;

    for (const file of files) {
      if (shouldSkipFile(file)) continue;
      totalFiles++;

      let source;
      try {
        source = readFileSync(file, 'utf8');
      } catch {
        console.error(`[zod4-codemod] ERROR reading ${file}`);
        continue;
      }

      const { changed, content, count } = applyCodemod(source);
      if (!changed) continue;

      targetChanged++;
      totalChangedFiles++;
      targetReplacements += count;
      totalReplacements += count;

      const relPath = relative(REPO_ROOT, file);
      console.log(`[zod4-codemod] ${dryRun ? '(dry) ' : ''}${relPath} — ${count} replacement${count !== 1 ? 's' : ''}`);

      if (!dryRun) {
        writeFileSync(file, content, 'utf8');
      }
    }

    if (targetChanged > 0) {
      const relTarget = relative(REPO_ROOT, target);
      stats.push({ target: relTarget, files: targetChanged, replacements: targetReplacements });
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log('\n─── zod4-codemod summary ───────────────────────────────────────');
  if (stats.length === 0) {
    console.log('No files required changes — all patterns already migrated.');
  } else {
    console.log('Target                                      Files  Replacements');
    console.log('──────────────────────────────────────────  ─────  ────────────');
    for (const s of stats) {
      const padded = s.target.padEnd(42);
      console.log(`${padded}  ${String(s.files).padStart(5)}  ${String(s.replacements).padStart(12)}`);
    }
    console.log('──────────────────────────────────────────  ─────  ────────────');
    console.log(`${'TOTAL'.padEnd(42)}  ${String(totalChangedFiles).padStart(5)}  ${String(totalReplacements).padStart(12)}`);
  }
  console.log(`\nScanned: ${totalFiles} files${dryRun ? ' (DRY RUN — no files written)' : ''}`);
}

main();
