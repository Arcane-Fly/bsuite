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
  const migrationsRel = scope.migrations_dir || (scope.workdir && scope.workdir !== '.' ? `${scope.workdir}/supabase/migrations` : 'supabase/migrations');
  const functionsRel = scope.functions_dir || (scope.workdir && scope.workdir !== '.' ? `${scope.workdir}/supabase/functions` : 'supabase/functions');
  const prefixes = [
    `${migrationsRel}/`,
    `${functionsRel}/`,
    scope.workdir === '.' ? 'supabase/config.toml' : `${scope.workdir}/supabase/config.toml`,
  ];
  if (changedFiles.some((file) => prefixes.some((prefix) => file.startsWith(prefix) || file === prefix))) {
    return true;
  }

  // A SUBMODULE POINTER BUMP IS THE ONLY WAY MIGRATIONS REACH PRODUCTION, and until this
  // was added the planner could not see one.
  //
  // On a parent development -> main promotion, `git diff --name-only` does not list
  // `crm7/supabase/migrations/*.sql`. It lists the gitlink, one entry, exactly `crm7`.
  // Every prefix above is therefore missed, so the planner reported
  //     requires_preview_database: false, changed_scopes: []
  // on bsuite#1845 — a pull request that applies twenty migrations. Measured, not
  // reasoned: the diff for that range returns R80.4, braden, business-suite-unified,
  // conduit, crm7, throughput and nothing under any supabase/ path.
  //
  // A crash is loud. This was worse: a confident, green "no preview database required"
  // over a batch nobody had planned. Treating the gitlink as a change to the scope is
  // deliberately CONSERVATIVE — a pointer move may or may not carry migrations, and the
  // parent checkout cannot always resolve the submodule's objects to find out. Planning
  // a scope that turns out to be unchanged costs a wasted plan; missing one costs an
  // unplanned production apply.
  if (scope.workdir && scope.workdir !== '.') {
    return changedFiles.some((file) => file === scope.workdir);
  }
  return false;
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
    lines.push(`| ${scope.id} | ${scope.changed ? 'yes' : 'no'} | ${scope.migration_count} | ${scope.function_count} | \`${scope.workdir}\` |`);
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

// A scope may legitimately own no database at all. R80.4 is the live example: it is a
// wage calculator with no supabase/ directory and no @supabase dependency, and
// 4c29c213 deliberately DELETED its migrations_dir/functions_dir keys so the applier
// would stop failing the whole run over a path that never existed.
//
// That fix was made in the applier and never propagated here. The applier decides by
// asking the filesystem (supabase-migrate.yml:252 — "has no $WORKDIR/supabase/migrations
// directory"), which works whether or not the key is present. This planner instead read
// the KEY, so `resolve(root, undefined)` threw
//     TypeError: The "paths[1]" argument must be of type string. Received undefined
// killing the run before it could post a plan comment. Two consumers of one manifest,
// one convention, only one of them taught it.
//
// `has_database: false` was recorded on that scope at the same time and, until now, had
// ZERO readers anywhere in the tree — a flag that documented an intention without
// enforcing it. It is honoured here, so it is a control rather than a note.
//
// Resolution order, deliberately the applier's convention first so the two agree:
//   1. has_database === false            -> no database, skip, say so
//   2. explicit *_dir key when present   -> use it
//   3. else derive <workdir>/supabase/*  -> the applier's rule
//   4. derived path absent               -> no database, skip, say so
// A scope with neither an explicit key nor a workdir is a malformed manifest, and that
// fails loudly by name instead of as a TypeError from node:path.
function resolveScopeDirs(scope) {
  if (scope.has_database === false) {
    return { migrationsDir: null, functionsDir: null, migrationsRel: null, functionsRel: null };
  }
  if (!scope.migrations_dir && !scope.workdir) {
    throw new Error(
      `migration-scopes.json: scope '${scope.id ?? '(no id)'}' has neither migrations_dir nor workdir, `
      + 'so its migrations directory cannot be resolved. Set migrations_dir, set workdir, '
      + 'or mark the scope "has_database": false if it owns no database objects.',
    );
  }
  const migrationsRel = scope.migrations_dir || `${scope.workdir}/supabase/migrations`;
  const functionsRel = scope.functions_dir || `${scope.workdir}/supabase/functions`;
  return {
    migrationsRel,
    functionsRel,
    migrationsDir: resolve(root, migrationsRel),
    functionsDir: resolve(root, functionsRel),
  };
}

const scopes = config.scopes.map((scope) => {
  const { migrationsDir, functionsDir, migrationsRel, functionsRel } = resolveScopeDirs(scope);
  const hasDatabase = migrationsDir !== null && existsSync(migrationsDir);
  const migrations = hasDatabase
    ? execFileSync('find', [migrationsRel, '-maxdepth', '1', '-type', 'f', '-name', '*.sql'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : [];
  const functions = functionsDir !== null && existsSync(functionsDir)
    ? execFileSync('find', [functionsRel, '-mindepth', '1', '-maxdepth', '1', '-type', 'd'], { cwd: root, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
    : [];
  if (!hasDatabase) {
    // Matches the applier's ::notice:: so the two read the same in a log.
    console.error(`[plan-preview-db] scope '${scope.id}' owns no database objects (no ${migrationsRel ?? 'migrations directory'}) — skipping.`);
  }
  return {
    id: scope.id,
    workdir: scope.workdir,
    migrations_dir: scope.migrations_dir,
    functions_dir: scope.functions_dir,
    // A scope that owns no database can never require a preview database, however its
    // pointer moves. Without this, R80.4's gitlink bumping on a promotion would flip
    // requires_preview_database to true and demand a preview DB for a wage calculator
    // with no schema — the conservative gitlink rule in scopeChanged() overshooting.
    changed: hasDatabase && (options.all || globalScopeChange || explicitChangedScopes.has(scope.id) || scopeChanged(scope, changedFiles)),
    migration_count: migrations.length,
    function_count: functions.length,
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
