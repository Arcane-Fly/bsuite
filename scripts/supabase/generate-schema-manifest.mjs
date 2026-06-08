#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const manifestPath = resolve(root, 'supabase/migration-scopes.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function listFiles(dir, predicate) {
  const full = resolve(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter(predicate)
    .sort((a, b) => a.localeCompare(b));
}

function listDirs(dir) {
  const full = resolve(root, dir);
  if (!existsSync(full)) return [];
  return readdirSync(full, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

function migrationKind(fileName) {
  if (fileName.endsWith('.nontx.sql')) return 'non_transactional';
  if (fileName.endsWith('.sql')) return 'transactional';
  return 'other';
}

function migrationVersion(fileName) {
  if (fileName.endsWith('.nontx.sql')) return fileName.slice(0, -'.nontx.sql'.length);
  if (fileName.endsWith('.sql')) return fileName.slice(0, -'.sql'.length);
  return fileName;
}

const config = readJson(manifestPath);
const scopes = config.scopes.map((scope) => {
  const migrations = listFiles(scope.migrations_dir, (file) => file.endsWith('.sql')).map((file) => ({
    file,
    version: migrationVersion(file),
    kind: migrationKind(file),
  }));
  const functions = listDirs(scope.functions_dir);
  const transactional = migrations.filter((migration) => migration.kind === 'transactional');
  const nonTransactional = migrations.filter((migration) => migration.kind === 'non_transactional');

  return {
    id: scope.id,
    label: scope.label,
    repo: scope.repo,
    owner: scope.owner,
    workdir: scope.workdir,
    migrations_dir: scope.migrations_dir,
    functions_dir: scope.functions_dir,
    exists: {
      migrations_dir: existsSync(resolve(root, scope.migrations_dir)),
      functions_dir: existsSync(resolve(root, scope.functions_dir)),
    },
    migration_count: migrations.length,
    transactional_count: transactional.length,
    non_transactional_count: nonTransactional.length,
    latest_transactional_version: transactional.at(-1)?.version ?? null,
    latest_non_transactional_version: nonTransactional.at(-1)?.version ?? null,
    migrations,
    functions,
  };
});

const summary = {
  scope_count: scopes.length,
  migration_count: scopes.reduce((count, scope) => count + scope.migration_count, 0),
  transactional_count: scopes.reduce((count, scope) => count + scope.transactional_count, 0),
  non_transactional_count: scopes.reduce((count, scope) => count + scope.non_transactional_count, 0),
  function_count: scopes.reduce((count, scope) => count + scope.functions.length, 0),
};

const output = {
  schema_version: '1.0',
  generated_by: 'scripts/supabase/generate-schema-manifest.mjs',
  project_ref: config.project_ref,
  recommended_control_plane: config.recommended_control_plane,
  summary,
  scopes,
  preview_database: config.preview_database,
};

console.log(JSON.stringify(output, null, 2));
