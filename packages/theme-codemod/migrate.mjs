/**
 * @bsuite/theme-codemod — migrate.mjs
 *
 * Migrates hardcoded Tailwind colour classes → @bsuite/theme semantic tokens.
 * Reference: packages/theme/docs/TOKEN-MAPPING.md
 *
 * Usage:
 *   node migrate.mjs [--dry-run] [--app=<name>] [--file=<path>]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Resolve workspace root (two levels up from packages/theme-codemod/)
// ---------------------------------------------------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(__dirname, '..', '..');

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const appArg = args.find((a) => a.startsWith('--app='))?.slice('--app='.length);
const fileArg = args.find((a) => a.startsWith('--file='))?.slice('--file='.length);

// ---------------------------------------------------------------------------
// App definitions
// ---------------------------------------------------------------------------
const D2C_APPS = [
  { name: 'business-suite-unified', srcDir: 'src' },
  { name: 'crm7',                   srcDir: 'src' },
  { name: 'R80.3',                  srcDir: 'src' },
  { name: 'conduit',                srcDir: 'src/app' },
  { name: 'throughput',             srcDir: 'src' },
];

const BRADEN_APP = { name: 'braden', srcDir: 'src' };

// ---------------------------------------------------------------------------
// Files that Claude owns — never touch these
// ---------------------------------------------------------------------------
const SKIP_FILES = new Set([
  'crm7/src/components/leads/LeadForm.tsx',
  'crm7/src/lib/leads.ts',
  'crm7/src/pages/contacts/create.tsx',
  'crm7/src/pages/leads/create.tsx',
  'crm7/src/pages/leads/edit.tsx',
  'crm7/src/types/entities.ts',
  'crm7/supabase/migrations/20260422140000_phase1_golden_path_fks.sql',
  'business-suite-unified/supabase/migrations/20260422140100_update_braden_lead_notification_email.sql',
  'business-suite-unified/tests/e2e/phase1-braden-lead-notification.spec.ts',
]);

// ---------------------------------------------------------------------------
// AUTO replacement table
// (ordered: longest / most specific patterns first to avoid partial clobber)
// ---------------------------------------------------------------------------
const AUTO_REPLACEMENTS = [
  // ── text: slate ──────────────────────────────────────────────────────────
  { from: /\btext-slate-900\b/g, to: 'text-foreground' },
  { from: /\btext-slate-800\b/g, to: 'text-foreground' },
  { from: /\btext-slate-700\b/g, to: 'text-foreground' },
  { from: /\btext-slate-600\b/g, to: 'text-muted-foreground' },
  { from: /\btext-slate-500\b/g, to: 'text-muted-foreground' },
  { from: /\btext-slate-400\b/g, to: 'text-muted-foreground' },
  { from: /\btext-slate-300\b/g, to: 'text-muted-foreground' },
  { from: /\btext-slate-200\b/g, to: 'text-muted-foreground' },
  { from: /\btext-slate-100\b/g, to: 'text-muted-foreground' },

  // ── text: gray ───────────────────────────────────────────────────────────
  { from: /\btext-gray-900\b/g, to: 'text-foreground' },
  { from: /\btext-gray-800\b/g, to: 'text-foreground' },
  { from: /\btext-gray-700\b/g, to: 'text-foreground' },
  { from: /\btext-gray-600\b/g, to: 'text-muted-foreground' },
  { from: /\btext-gray-500\b/g, to: 'text-muted-foreground' },
  { from: /\btext-gray-400\b/g, to: 'text-muted-foreground' },
  { from: /\btext-gray-300\b/g, to: 'text-muted-foreground' },
  { from: /\btext-gray-200\b/g, to: 'text-muted-foreground' },
  { from: /\btext-gray-100\b/g, to: 'text-muted-foreground' },

  // ── text: zinc ───────────────────────────────────────────────────────────
  { from: /\btext-zinc-900\b/g, to: 'text-foreground' },
  { from: /\btext-zinc-800\b/g, to: 'text-foreground' },
  { from: /\btext-zinc-700\b/g, to: 'text-foreground' },
  { from: /\btext-zinc-600\b/g, to: 'text-muted-foreground' },
  { from: /\btext-zinc-500\b/g, to: 'text-muted-foreground' },
  { from: /\btext-zinc-400\b/g, to: 'text-muted-foreground' },
  { from: /\btext-zinc-300\b/g, to: 'text-muted-foreground' },
  { from: /\btext-zinc-200\b/g, to: 'text-muted-foreground' },
  { from: /\btext-zinc-100\b/g, to: 'text-muted-foreground' },

  // ── text: neutral ────────────────────────────────────────────────────────
  { from: /\btext-neutral-900\b/g, to: 'text-foreground' },
  { from: /\btext-neutral-800\b/g, to: 'text-foreground' },
  { from: /\btext-neutral-700\b/g, to: 'text-foreground' },
  { from: /\btext-neutral-600\b/g, to: 'text-muted-foreground' },
  { from: /\btext-neutral-500\b/g, to: 'text-muted-foreground' },
  { from: /\btext-neutral-400\b/g, to: 'text-muted-foreground' },
  { from: /\btext-neutral-300\b/g, to: 'text-muted-foreground' },
  { from: /\btext-neutral-200\b/g, to: 'text-muted-foreground' },
  { from: /\btext-neutral-100\b/g, to: 'text-muted-foreground' },

  // ── bg: slate ────────────────────────────────────────────────────────────
  { from: /\bbg-slate-50\b/g,  to: 'bg-background' },
  { from: /\bbg-slate-100\b/g, to: 'bg-muted' },
  { from: /\bbg-slate-200\b/g, to: 'bg-muted' },
  { from: /\bbg-slate-800\b/g, to: 'bg-card' },       // TOKEN-MAPPING: dark card surface
  { from: /\bbg-slate-900\b/g, to: 'bg-background' },
  { from: /\bbg-slate-950\b/g, to: 'bg-background' },

  // ── bg: gray ─────────────────────────────────────────────────────────────
  { from: /\bbg-gray-50\b/g,  to: 'bg-background' },
  { from: /\bbg-gray-100\b/g, to: 'bg-muted' },
  { from: /\bbg-gray-200\b/g, to: 'bg-muted' },
  { from: /\bbg-gray-800\b/g, to: 'bg-card' },        // TOKEN-MAPPING: dark card surface
  { from: /\bbg-gray-900\b/g, to: 'bg-background' },
  { from: /\bbg-gray-950\b/g, to: 'bg-background' },

  // ── bg: zinc ─────────────────────────────────────────────────────────────
  { from: /\bbg-zinc-50\b/g,  to: 'bg-muted' },
  { from: /\bbg-zinc-100\b/g, to: 'bg-muted' },
  { from: /\bbg-zinc-200\b/g, to: 'bg-muted' },
  { from: /\bbg-zinc-800\b/g, to: 'bg-background' },
  { from: /\bbg-zinc-900\b/g, to: 'bg-background' },
  { from: /\bbg-zinc-950\b/g, to: 'bg-background' },

  // ── bg: neutral ──────────────────────────────────────────────────────────
  { from: /\bbg-neutral-50\b/g,  to: 'bg-muted' },
  { from: /\bbg-neutral-100\b/g, to: 'bg-muted' },
  { from: /\bbg-neutral-200\b/g, to: 'bg-muted' },
  { from: /\bbg-neutral-800\b/g, to: 'bg-background' },
  { from: /\bbg-neutral-900\b/g, to: 'bg-background' },
  { from: /\bbg-neutral-950\b/g, to: 'bg-background' },

  // ── border: slate ────────────────────────────────────────────────────────
  { from: /\bborder-slate-100\b/g, to: 'border-border' },
  { from: /\bborder-slate-200\b/g, to: 'border-border' },
  { from: /\bborder-slate-300\b/g, to: 'border-border' },
  { from: /\bborder-slate-600\b/g, to: 'border-border-strong' }, // TOKEN-MAPPING §1 border table
  { from: /\bborder-slate-700\b/g, to: 'border-border-strong' },

  // ── border: gray ─────────────────────────────────────────────────────────
  { from: /\bborder-gray-100\b/g, to: 'border-border' },
  { from: /\bborder-gray-200\b/g, to: 'border-border' },
  { from: /\bborder-gray-300\b/g, to: 'border-border' },
  { from: /\bborder-gray-600\b/g, to: 'border-border-strong' },
  { from: /\bborder-gray-700\b/g, to: 'border-border-strong' },

  // ── divide ───────────────────────────────────────────────────────────────
  { from: /\bdivide-slate-200\b/g, to: 'divide-border' },
  { from: /\bdivide-gray-200\b/g,  to: 'divide-border' },
];

// ---------------------------------------------------------------------------
// REVIEW patterns — lines that contain these get an inline flag comment
// ---------------------------------------------------------------------------
const REVIEW_PATTERNS = [
  { pattern: /\btext-white\b/, label: 'text-white' },
  { pattern: /\bbg-white\b/,   label: 'bg-white' },
  { pattern: /\btext-black\b/, label: 'text-black' },
  { pattern: /\bbg-black\b/,   label: 'bg-black' },
];

const REVIEW_COMMENT = (label) =>
  ` /* THEME-REVIEW: ${label} — verify semantic token */`;

// ---------------------------------------------------------------------------
// MANUAL patterns — inline hex colours
// ---------------------------------------------------------------------------
const MANUAL_PATTERNS = [
  // style={{ color: '#xxx' }} or style={{ backgroundColor: '#xxx' }} etc.
  /style=\{\{[^}]*#[0-9a-fA-F]{3,8}[^}]*\}\}/,
  // className="... bg-[#...] ..."  or  className="... text-[#...] ..."
  /className=[`"'][^`"']*\[#[0-9a-fA-F]{3,8}\][^`"']*[`"']/,
  // Bare arbitrary-value bracket in JSX attribute context
  /\b(?:bg|text|border|fill|stroke|ring|shadow|outline)-\[#[0-9a-fA-F]{3,8}\]/,
];

const MANUAL_COMMENT =
  ' /* THEME-MANUAL: hardcoded colour — replace with var(--token) */';

// ---------------------------------------------------------------------------
// File extension filter
// ---------------------------------------------------------------------------
const ALLOWED_EXTS = new Set(['.tsx', '.ts', '.css']);

// ---------------------------------------------------------------------------
// Directory walk
// ---------------------------------------------------------------------------
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.next', 'build', 'out', '.turbo']);

function* walkDir(dirPath) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      yield* walkDir(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------------------
// Core file processor
// ---------------------------------------------------------------------------
function processFile(filePath, appName, isBradenMode) {
  const result = {
    modified: false,
    autoReplacements: 0,
    reviewFlags: 0,
    manualFlags: 0,
    changes: [],   // { lineNo, before, after } — populated in dry-run mode too
  };

  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch {
    return null; // unreadable — skip silently
  }

  // Skip BRADEN-EXEMPT files
  if (source.includes('/* BRADEN-EXEMPT */')) {
    return null;
  }

  const lines = source.split('\n');
  const newLines = lines.map((line, idx) => {
    let newLine = line;
    const lineNo = idx + 1;

    // (a) AUTO replacements
    for (const { from, to } of AUTO_REPLACEMENTS) {
      const replaced = newLine.replace(from, to);
      if (replaced !== newLine) {
        const matchCount = (newLine.match(from) || []).length;
        result.autoReplacements += matchCount;
        result.changes.push({ lineNo, before: newLine, after: replaced });
        newLine = replaced;
      }
    }

    // (b) REVIEW flags — only add if not already flagged
    for (const { pattern, label } of REVIEW_PATTERNS) {
      if (pattern.test(newLine) && !newLine.includes('THEME-REVIEW')) {
        const comment = REVIEW_COMMENT(label);
        // Strip trailing newline characters before appending, re-add after
        newLine = newLine.replace(/\s*$/, '') + comment;
        result.reviewFlags++;
        result.changes.push({ lineNo, before: line, after: newLine });
      }
    }

    // (c) MANUAL flags for inline hex
    if (!newLine.includes('THEME-MANUAL')) {
      for (const pat of MANUAL_PATTERNS) {
        if (pat.test(newLine)) {
          newLine = newLine.replace(/\s*$/, '') + MANUAL_COMMENT;
          result.manualFlags++;
          result.changes.push({ lineNo, before: line, after: newLine });
          break; // one flag per line is sufficient
        }
      }
    }

    return newLine;
  });

  const newSource = newLines.join('\n');
  if (newSource !== source) {
    result.modified = true;
    result.newSource = newSource;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Stats accumulator
// ---------------------------------------------------------------------------
const stats = {
  files_scanned: 0,
  files_modified: 0,
  auto_replacements: 0,
  review_flags: 0,
  manual_flags: 0,
  files_skipped: 0,
};

// Log lines collected during the run
const logLines = [];

function log(msg) {
  console.log(msg);
  logLines.push(msg);
}

// ---------------------------------------------------------------------------
// Process a single resolved file path
// ---------------------------------------------------------------------------
function handleFile(absPath, appName, isBradenMode) {
  // Resolve relative path from workspace root for skip-list lookup
  const relPath = path.relative(WORKSPACE_ROOT, absPath).replace(/\\/g, '/');

  // Claude-owned file guard
  if (SKIP_FILES.has(relPath)) {
    stats.files_skipped++;
    log(`[SKIP] ${relPath}  (Claude-owned file)`);
    return;
  }

  // When processing D2C apps, skip anything under braden/src/
  if (!isBradenMode && relPath.startsWith('braden/src/')) {
    stats.files_skipped++;
    return;
  }

  // Extension filter
  const ext = path.extname(absPath);
  if (!ALLOWED_EXTS.has(ext)) return;

  stats.files_scanned++;

  const result = processFile(absPath, appName, isBradenMode);
  if (result === null) {
    stats.files_skipped++;
    return;
  }

  stats.auto_replacements += result.autoReplacements;
  stats.review_flags      += result.reviewFlags;
  stats.manual_flags      += result.manualFlags;

  if (result.modified) {
    stats.files_modified++;

    if (DRY_RUN) {
      log(`\n[DRY-RUN] Would modify: ${relPath}`);
      for (const ch of result.changes) {
        log(`  Line ${ch.lineNo}:`);
        log(`    - ${ch.before}`);
        log(`    + ${ch.after}`);
      }
    } else {
      fs.writeFileSync(absPath, result.newSource, 'utf8');
      log(`[MODIFIED] ${relPath}  (auto:${result.autoReplacements} review:${result.reviewFlags} manual:${result.manualFlags})`);
    }
  }
}

// ---------------------------------------------------------------------------
// Determine apps to process
// ---------------------------------------------------------------------------
function resolveApps() {
  if (fileArg) return null; // single-file mode — apps not used

  if (!appArg) {
    // Default: all D2C apps
    return { d2cApps: D2C_APPS, includeBraden: false };
  }

  if (appArg === 'braden') {
    return { d2cApps: [], includeBraden: true };
  }

  // Named D2C app
  const found = D2C_APPS.find((a) => a.name === appArg);
  if (!found) {
    console.error(`Unknown app: ${appArg}`);
    console.error(`Valid apps: ${D2C_APPS.map((a) => a.name).join(', ')}, braden`);
    process.exit(1);
  }
  return { d2cApps: [found], includeBraden: false };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const isoDate = new Date().toISOString().replace(/:/g, '-').slice(0, 19);
  const logFile = path.join(__dirname, `codemod-run-${isoDate}.log`);

  log(`@bsuite/theme-codemod`);
  log(`Mode: ${DRY_RUN ? 'DRY-RUN (no files written)' : 'LIVE'}`);
  log(`Started: ${new Date().toISOString()}`);
  log('─'.repeat(60));

  if (fileArg) {
    // ── Single-file mode ────────────────────────────────────────────────
    const absPath = path.resolve(fileArg);
    if (!fs.existsSync(absPath)) {
      console.error(`File not found: ${absPath}`);
      process.exit(1);
    }
    handleFile(absPath, '<single>', false);
  } else {
    // ── Multi-app mode ──────────────────────────────────────────────────
    const { d2cApps, includeBraden } = resolveApps();

    for (const app of d2cApps) {
      const appRoot = path.join(WORKSPACE_ROOT, app.name);
      const srcDir  = path.join(appRoot, app.srcDir);

      if (!fs.existsSync(srcDir)) {
        log(`[WARN] ${app.name}/${app.srcDir} not found — skipping app`);
        continue;
      }

      log(`\nProcessing app: ${app.name}  (${app.srcDir})`);
      for (const filePath of walkDir(srcDir)) {
        handleFile(filePath, app.name, /* isBradenMode */ false);
      }
    }

    if (includeBraden) {
      const bradenSrc = path.join(WORKSPACE_ROOT, BRADEN_APP.name, BRADEN_APP.srcDir);
      if (!fs.existsSync(bradenSrc)) {
        log(`[WARN] braden/src not found — skipping`);
      } else {
        log(`\nProcessing app: braden  (corporate token mapping)`);
        for (const filePath of walkDir(bradenSrc)) {
          handleFile(filePath, 'braden', /* isBradenMode */ true);
        }
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  log('\n' + '═'.repeat(60));
  log('CODEMOD SUMMARY');
  log('═'.repeat(60));
  log(`  files_scanned      : ${stats.files_scanned}`);
  log(`  files_modified     : ${stats.files_modified}`);
  log(`  auto_replacements  : ${stats.auto_replacements}`);
  log(`  review_flags       : ${stats.review_flags}`);
  log(`  manual_flags       : ${stats.manual_flags}`);
  log(`  files_skipped      : ${stats.files_skipped}`);
  if (DRY_RUN) {
    log('\n  ⚠  DRY-RUN — no files were written.');
  }
  log('═'.repeat(60));
  log(`Finished: ${new Date().toISOString()}`);

  // ── Write log file ───────────────────────────────────────────────────────
  fs.writeFileSync(logFile, logLines.join('\n') + '\n', 'utf8');
  console.log(`\nLog written → ${path.relative(WORKSPACE_ROOT, logFile)}`);
}

main();
