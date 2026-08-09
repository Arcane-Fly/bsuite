#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'supabase/migration-scopes.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function parseArgs(argv) {
  const options = {
    base: process.env.BASE_SHA || '',
    head: process.env.HEAD_SHA || 'HEAD',
    sourceRepo: process.env.SOURCE_REPO || '',
    changedFiles: parseJsonArray(process.env.CHANGED_FILES_JSON || ''),
    changedScopes: parseList(process.env.CHANGED_SCOPES || ''),
    json: false,
    markdown: false,
    all: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--') continue;
    if (arg === '--json') options.json = true;
    else if (arg === '--markdown') options.markdown = true;
    else if (arg === '--all') options.all = true;
    else if (arg === '--changed-file') {
      options.changedFiles.push(argv[index + 1] || '');
      index += 1;
    } else if (arg === '--changed-scope') {
      options.changedScopes.push(argv[index + 1] || '');
      index += 1;
    } else if (arg === '--source-repo') {
      options.sourceRepo = argv[index + 1] || '';
      index += 1;
    }
    else if (arg === '--base') {
      options.base = argv[index + 1] || '';
      index += 1;
    } else if (arg === '--head') {
      options.head = argv[index + 1] || 'HEAD';
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function parseJsonArray(value) {
  if (!value || value === 'null') return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) return [];
  return parsed.map((item) => String(item)).filter(Boolean);
}

function parseList(value) {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function gitDiffNames(base, head) {
  if (!base) return [];
  const output = execFileSync('git', ['diff', '--name-only', `${base}...${head}`], {
    cwd: root,
    encoding: 'utf8',
  });
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function normalizeChangedFile(file, sourceRepo) {
  if (!sourceRepo || sourceRepo === 'bsuite') return file;
  if (file.startsWith(`${sourceRepo}/`)) return file;
  if (file.startsWith('supabase/')) return `${sourceRepo}/${file}`;
  return file;
}

function scopeChanged(scope, changedFiles) {
  const prefixes = [
    // A scope may legitimately own NO database objects — R80.4 is exactly
    // that, and its manifest entry carries no migrations_dir/functions_dir.
    // Interpolating undefined produced the prefix "undefined/", which matches
    // nothing, so the bug was invisible here and fatal at resolve() below.
    scope.migrations_dir ? `${scope.migrations_dir}/` : null,
    scope.functions_dir ? `${scope.functions_dir}/` : null,
    scope.workdir === '.' ? 'supabase/config.toml' : `${scope.workdir}/supabase/config.toml`,
    // A submodule POINTER bump is a database change: the gitlink is the only
    // path that moves, and every glob above is nested inside the submodule, so
    // none of them ever match a promotion. This is the same blindness that
    // once silently stopped the applier (supabase-migrate.yml, gap-assessment
    // T1-01) — fixed there, never fixed here.
    scope.workdir === '.' ? null : scope.workdir,
  ].filter(Boolean);
  return changedFiles.some((file) => prefixes.some((prefix) => file.startsWith(`${prefix}/`) || file === prefix));
}

function toMarkdown(plan) {
  const lines = [
    '## Supabase Preview Database Plan',
    '',
    `Project ref: \`${plan.project_ref}\``,
    `Control plane: \`${plan.recommended_control_plane}\``,
    `Requires preview DB: **${plan.requires_preview_database ? 'yes' : 'no'}**`,
    '',
    '| Scope | Changed | Migrations | Functions | Workdir |',
    '|---|---:|---:|---:|---|',
  ];
  for (const scope of plan.scopes) {
    const count = (n) => (n === null
      ? (scope.owns_database_objects ? 'not counted (submodule not checked out)' : 'owns none')
      : String(n));
    lines.push(`| ${scope.id} | ${scope.changed ? 'yes' : 'no'} | ${count(scope.migration_count)} | ${count(scope.function_count)} | \`${scope.workdir}\` |`);
  }
  lines.push('');
  if (plan.changed_files.length > 0) {
    lines.push('<details><summary>Changed Supabase files</summary>', '');
    for (const file of plan.changed_files) lines.push(`- \`${file}\``);
    lines.push('', '</details>', '');
  }
  lines.push('### Recommended next step');
  if (plan.requires_preview_database) {
    lines.push('- Ensure the parent `bsuite` Supabase GitHub integration is connected with working directory `.` and required check `Supabase Preview` enabled, or dispatch a parent preview workflow from the app PR.');
    lines.push('- Ensure Vercel preview env aliases include canonical `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` for Vite apps and `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for Conduit.');
  } else {
    lines.push('- No Supabase migrations/functions changed. Reuse the normal app preview environment.');
  }
  return `${lines.join('\n')}\n`;
}

const options = parseArgs(process.argv.slice(2));
const config = readJson(manifestPath);
const explicitChangedFiles = options.changedFiles.map((file) => normalizeChangedFile(file, options.sourceRepo));
const changedFiles = options.all
  ? []
  : explicitChangedFiles.length > 0
    ? explicitChangedFiles
    : gitDiffNames(options.base, options.head);
const globalScopeChange = changedFiles.some((file) => (
  file === 'supabase/migration-scopes.json'
  || file === 'supabase/config.toml'
));
const explicitChangedScopes = new Set(options.changedScopes);
const scopes = config.scopes.map((scope) => {
  // A scope with no migrations_dir owns no database objects (R80.4). Before
  // this guard, resolve(root, undefined) threw ERR_INVALID_ARG_TYPE and killed
  // the process on EVERY invocation — including --all — so the preview plan
  // has never posted on any pull request, and the failure looked like the
  // workflow simply not running.
  const migrationsDir = scope.migrations_dir ? resolve(root, scope.migrations_dir) : null;
  const functionsDir = scope.functions_dir ? resolve(root, scope.functions_dir) : null;
  const migrations = migrationsDir && existsSync(migrationsDir)
    ? execFileSync('find', [scope.migrations_dir, '-maxdepth', '1', '-type', 'f', '-name', '*.sql'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : [];
  const functions = functionsDir && existsSync(functionsDir)
    ? execFileSync('find', [scope.functions_dir, '-mindepth', '1', '-maxdepth', '1', '-type', 'd'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : [];
  // The PR job checks out with `submodules: false` (deliberately — it runs
  // PR-controlled scripts and must not carry the cross-repo PAT). So for a
  // submodule scope the directory is simply ABSENT, and reporting
  // `migration_count: 0` would state "this scope has no migrations" when the
  // truth is "nobody counted". A denial, a skip and a genuine zero must never
  // render identically.
  const owns_migrations_dir = Boolean(scope.migrations_dir);
  const counted = owns_migrations_dir && existsSync(migrationsDir);
  return {
    id: scope.id,
    workdir: scope.workdir,
    migrations_dir: scope.migrations_dir ?? null,
    functions_dir: scope.functions_dir ?? null,
    owns_database_objects: owns_migrations_dir,
    counted,
    changed: options.all || globalScopeChange || explicitChangedScopes.has(scope.id) || scopeChanged(scope, changedFiles),
    migration_count: counted ? migrations.length : null,
    function_count: counted ? functions.length : null,
  };
});

const changedScopes = scopes.filter((scope) => scope.changed).map((scope) => scope.id);
const plan = {
  schema_version: '1.0',
  project_ref: config.project_ref,
  recommended_control_plane: config.recommended_control_plane,
  native_github_working_directory: config.preview_database.native_github_working_directory,
  native_required_check: config.preview_database.native_required_check,
  requires_preview_database: changedScopes.length > 0,
  changed_scopes: changedScopes,
  changed_files: changedFiles.filter((file) => file.includes('supabase/')),
  scopes,
};

if (process.env.GITHUB_OUTPUT) {
  writeFileSync(process.env.GITHUB_OUTPUT, `requires_preview_database=${plan.requires_preview_database}\n`, { flag: 'a' });
  writeFileSync(process.env.GITHUB_OUTPUT, `changed_scopes=${changedScopes.join(',')}\n`, { flag: 'a' });
}

if (options.markdown) {
  process.stdout.write(toMarkdown(plan));
} else {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}
