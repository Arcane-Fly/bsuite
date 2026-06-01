#!/usr/bin/env node
/**
 * Dry-run the @bsuite/dry-lint rules across every submodule and print one row
 * per violation. Designed to be invoked from anywhere — paths resolve from the
 * package directory.
 *
 * Build first:
 *   pnpm --filter @bsuite/dry-lint build
 * Then run:
 *   node packages/dry-lint/scripts/dry-run.mjs
 *   node packages/dry-lint/scripts/dry-run.mjs --rule=no-uuid-input-placeholder
 *
 * By default scans for ALL bsuite rules. Pass `--rule=<rule-name>` to scope.
 */
import { Linter } from 'eslint';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { resolve, relative, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsParser from '@typescript-eslint/parser';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../../..');
const pluginPath = resolve(here, '../dist/index.js');

const { default: bsuiteDryLint } = await import(pluginPath);

const APPS = [
  { dir: 'business-suite-unified', name: 'bsu' },
  { dir: 'crm7', name: 'crm7' },
  { dir: 'conduit', name: 'conduit' },
  { dir: 'braden', name: 'braden' },
  { dir: 'R80.3', name: 'r80' },
  { dir: 'throughput', name: 'throughput' },
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.next',
  'build',
  'coverage',
  '.turbo',
  '.vercel',
  '.git',
  'storybook-static',
  'public',
  '__tests__',
  '__mocks__',
  'tests',
  'test',
  'e2e',
  'cypress',
  'playwright',
  'playwright-report',
  'test-results',
]);

const linter = new Linter({ configType: 'flat' });

// Optional --rule=<name> filter. When omitted, all bsuite rules report.
const ruleArg = process.argv.find((a) => a.startsWith('--rule='));
const ruleFilter = ruleArg ? ruleArg.slice('--rule='.length) : null;

// Default rule set when no --rule= filter is given. Intentionally omits
// `no-raw-entity-select` and `oauth-callback-must-bridge` because those have
// legitimate exception sets per consumer (see consumer eslint.config.js
// overrides) and would spam the dry-run output with already-triaged cases.
// To dry-run those rules explicitly, pass `--rule=no-raw-entity-select` or
// `--rule=oauth-callback-must-bridge`.
const DRY_RUN_DEFAULT_RULES = {
  'bsuite/no-cross-app-write': 'warn',
  'bsuite/no-uuid-input-placeholder': 'warn',
};

const activeRules = ruleFilter
  ? { [`bsuite/${ruleFilter}`]: 'warn' }
  : DRY_RUN_DEFAULT_RULES;

function listSourceFiles(rootDir) {
  // Walk only the per-app `src/` (and `app/`/`pages/`/`lib/`/`supabase/functions`
  // for next-style projects) to keep the scan focused on shipped source code,
  // not generated/test files.
  const candidateRoots = ['src', 'app', 'pages', 'lib', 'supabase/functions'].map((sub) =>
    join(rootDir, sub),
  );
  const out = [];
  for (const root of candidateRoots) {
    let stat;
    try {
      stat = statSync(root);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    walk(root, out);
  }
  return out;
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = extname(entry.name);
    if (!SOURCE_EXTENSIONS.has(ext)) continue;
    if (entry.name.endsWith('.d.ts')) continue;
    if (entry.name.endsWith('.test.ts')) continue;
    if (entry.name.endsWith('.test.tsx')) continue;
    if (entry.name.endsWith('.spec.ts')) continue;
    if (entry.name.endsWith('.spec.tsx')) continue;
    out.push(full);
  }
}

const allViolations = [];
let totalFilesScanned = 0;

for (const app of APPS) {
  const appRoot = resolve(repoRoot, app.dir);
  const appFiles = listSourceFiles(appRoot);
  // Use a `files` glob so the flat-config matcher selects the file.
  // Pass the file as a relative path under `repoRoot` (set as cwd) so the
  // matcher's relative-path mode kicks in. The rule itself reads
  // `context.physicalFilename` which preserves the absolute path for app
  // detection.
  const config = [
    {
      files: ['**/*.ts', '**/*.tsx'],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module',
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: { bsuite: bsuiteDryLint },
      rules: activeRules,
    },
  ];

  for (const filename of appFiles) {
    let code;
    try {
      code = readFileSync(filename, 'utf8');
    } catch {
      continue;
    }
    totalFilesScanned += 1;
    const relFilename = relative(repoRoot, filename);
    let messages;
    try {
      messages = linter.verify(code, config, {
        filename: relFilename,
        physicalFilename: filename,
      });
    } catch (err) {
      console.error(`[dry-run] parse error in ${relFilename}: ${err.message}`);
      continue;
    }
    for (const m of messages) {
      if (m.ruleId && m.ruleId in activeRules) {
        allViolations.push({
          app: app.name,
          rule: m.ruleId,
          file: relFilename,
          line: m.line,
          column: m.column,
          message: m.message,
        });
      }
    }
  }
}

console.log(`# dry-run report — scanned ${totalFilesScanned} files across ${APPS.length} apps`);
if (ruleFilter) console.log(`# rule filter: bsuite/${ruleFilter}`);
console.log('');
console.log(`Total violations: ${allViolations.length}`);
console.log('');
for (const v of allViolations) {
  console.log(`- [${v.app}] [${v.rule}] ${v.file}:${v.line}:${v.column} — ${v.message}`);
}

// Non-zero exit code on violations so CI / pre-commit can wire this in.
if (allViolations.length > 0) {
  process.exit(1);
}
