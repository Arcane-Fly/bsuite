/**
 * THE SERVICE MAY ONLY NAME COLUMNS THE MIGRATIONS DECLARE.
 *
 * WHY THIS TEST EXISTS, IN THE PAST TENSE. Phase 1 shipped a package, a
 * migration and a seed that disagreed about two columns, and every one of the
 * package's 80 tests passed the whole time, because every one of them stubbed
 * the Supabase client. A stub answers whatever it is told to answer; it cannot
 * know that PostgREST would have said `42703 column ... does not exist`.
 *
 *   * `label` — declared on `WorkflowDefinitionRow`, ordered by in
 *     `listWorkflowDefinitions`, SET by the rename mutation, inserted by
 *     `createWorkflowDefinition`. The table has `name` and has never had
 *     `label`. Listing, renaming and creating a workflow each failed.
 *   * `published_at` — SET by `publishVersion()` and INSERTed by the merged
 *     apprentice seed. `20261103000000` declares `published_by` and no
 *     `published_at`, so publishing failed and the seed could never land the
 *     template that is the whole point of Phase 1. Added by
 *     `20261104000000_workflow_definition_versions_published_at.sql`.
 *
 * WHAT MAKES THIS A GATE RATHER THAN A GESTURE. It reads the migration FILES —
 * both of them, whichever scope this package sits beside — and parses the
 * columns out of them, so the set it checks against is the estate's own DDL
 * rather than a list somebody kept in step by hand. And it FAILS when it cannot
 * find the migrations at all, instead of passing vacuously: a gate that returns
 * "clean" when it read nothing is the shape this estate keeps finding after the
 * fact, and it is indistinguishable from a gate that read everything.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, '../..');
const REPO_ROOT = resolve(PACKAGE_ROOT, '../..');
const MIGRATIONS = resolve(REPO_ROOT, 'supabase/migrations');

const PHASE_1 = resolve(MIGRATIONS, '20261103000000_workflow_definitions.sql');
const PHASE_2 = resolve(
  MIGRATIONS,
  '20261104000000_workflow_definition_versions_published_at.sql',
);

const SERVICE = resolve(PACKAGE_ROOT, 'src/service.ts');

/**
 * Columns from `CREATE TABLE public.<name> ( ... )`, plus any added later by
 * `ALTER TABLE public.<name> ADD COLUMN [IF NOT EXISTS] <col>`.
 *
 * Comment lines are stripped first. Without that the header of 20261103000000 —
 * 140 lines of prose that names `tenant_id`, `graph` and `label` while
 * explaining them — would be parsed as DDL, and the test would "find" every
 * column it was looking for in a commentary about them.
 */
function declaredColumns(sql: string, table: string): Set<string> {
  const code = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const columns = new Set<string>();

  const create = new RegExp(
    `CREATE TABLE (?:IF NOT EXISTS )?public\\.${table}\\s*\\(([\\s\\S]*?)\\n\\);`,
    'i',
  ).exec(code);
  if (create?.[1]) {
    for (const raw of create[1].split('\n')) {
      const line = raw.trim();
      if (line.length === 0) continue;
      // A constraint clause is not a column, and `CONSTRAINT x CHECK (...)`
      // would otherwise contribute the identifier `CONSTRAINT`.
      if (/^(CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK|EXCLUDE)\b/i.test(line)) continue;
      const match = /^([a-z_][a-z0-9_]*)\s+/i.exec(line);
      if (match?.[1]) columns.add(match[1]);
    }
  }

  const alter = new RegExp(
    `ALTER TABLE public\\.${table}\\s+ADD COLUMN (?:IF NOT EXISTS )?([a-z_][a-z0-9_]*)`,
    'gi',
  );
  let m: RegExpExecArray | null;
  while ((m = alter.exec(code)) !== null) {
    if (m[1]) columns.add(m[1]);
  }

  return columns;
}

function loadDdl(): string {
  // Not `?? ''`. An unreadable migration must fail the test, not silently
  // shrink the column set until nothing is checked.
  expect(existsSync(PHASE_1), `missing migration: ${PHASE_1}`).toBe(true);
  expect(existsSync(PHASE_2), `missing migration: ${PHASE_2}`).toBe(true);
  return `${readFileSync(PHASE_1, 'utf8')}\n${readFileSync(PHASE_2, 'utf8')}`;
}

describe('workflow tables — the service may only name columns the DDL declares', () => {
  const ddl = loadDdl();
  const definitionColumns = declaredColumns(ddl, 'workflow_definitions');
  const versionColumns = declaredColumns(ddl, 'workflow_definition_versions');

  it('parses a plausible number of columns out of both tables', () => {
    // The control. If the parser silently matched nothing, every assertion
    // below would be `expect(set).not.toContain(...)` over an empty set and
    // would pass — which is exactly how a gate reports clean while blind.
    expect(definitionColumns.size).toBeGreaterThanOrEqual(8);
    expect(versionColumns.size).toBeGreaterThanOrEqual(10);
  });

  it('declares the columns the service reads and writes on workflow_definitions', () => {
    for (const column of [
      'id',
      'tenant_id',
      'key',
      'name',
      'description',
      'app_scope',
      'is_system',
      'current_published_version_id',
      'updated_at',
    ]) {
      expect(definitionColumns, `workflow_definitions.${column}`).toContain(column);
    }
  });

  it('declares the columns the service reads and writes on workflow_definition_versions', () => {
    for (const column of [
      'id',
      'workflow_definition_id',
      'tenant_id',
      'version',
      'status',
      'graph',
      'trigger_config',
      'ai_context',
      'published_at',
      'updated_at',
    ]) {
      expect(versionColumns, `workflow_definition_versions.${column}`).toContain(column);
    }
  });

  it('has NO label column — the display name is `name`', () => {
    // The defect this file was written for. Kept as its own assertion so the
    // failure message names the mistake rather than a missing key.
    expect(definitionColumns).not.toContain('label');
  });

  it('never mentions a `label` column in the service layer', () => {
    const service = readFileSync(SERVICE, 'utf8');
    // Prose in the header explains the defect and must stay readable, so only
    // the code is searched.
    const code = service
      .split('\n')
      .filter((line) => {
        const t = line.trimStart();
        return !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('//');
      })
      .join('\n');
    expect(code).not.toMatch(/['"`]label['"`]/);
    expect(code).not.toMatch(/\border\('label'/);
  });
});
