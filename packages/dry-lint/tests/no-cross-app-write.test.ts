import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import { resolve } from 'node:path';

import { noCrossAppWriteRule } from '../src/rules/no-cross-app-write.js';

// Wire RuleTester to vitest globals so reporting flows through the test runner.
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester();

/**
 * Build an absolute path that the path-detection helper will recognise as
 * belonging to the named app. We anchor under /tmp so the file doesn't
 * have to exist on disk.
 */
function pathFor(app: string, file: string): string {
  return resolve('/tmp/bsuite-fixture', app, 'src', file);
}

ruleTester.run('no-cross-app-write', noCrossAppWriteRule, {
  valid: [
    // Owner writing to its own table — allowed.
    {
      name: 'crm7 may insert into apprentices (its own table)',
      code: "supabase.from('apprentices').insert({ id: 1 });",
      filename: pathFor('crm7', 'lib/foo.ts'),
    },
    {
      name: 'r80 may upsert into award_rates (its own table)',
      code: "supabase.from('award_rates').upsert({ id: 1 });",
      filename: pathFor('r80.3', 'lib/foo.ts'),
    },
    {
      name: 'bsu may update tenants (its own table)',
      code: "supabase.from('tenants').update({ name: 'x' });",
      filename: pathFor('business-suite-unified', 'lib/foo.ts'),
    },
    {
      name: 'throughput may delete from ideas (its own table)',
      code: "supabase.from('ideas').delete();",
      filename: pathFor('throughput', 'lib/foo.ts'),
    },
    // Reads are always allowed regardless of owner.
    {
      name: 'crm7 may .select() from a BSU-owned table',
      code: "supabase.from('tenants').select('*');",
      filename: pathFor('crm7', 'lib/foo.ts'),
    },
    {
      name: 'throughput may .select() from team_members',
      code: "supabase.from('team_members').select('*').eq('user_id', 1);",
      filename: pathFor('throughput', 'lib/foo.ts'),
    },
    // Shared / event-sink tables accept writes from any app.
    {
      name: 'any app may write to bi_metrics (event sink)',
      code: "supabase.from('bi_metrics').insert({ event: 'x' });",
      filename: pathFor('crm7', 'lib/foo.ts'),
    },
    {
      name: 'r80 may upsert wage_calculation_snapshots (shared audit sink)',
      code: "supabase.from('wage_calculation_snapshots').upsert({ id: 1 });",
      filename: pathFor('r80.3', 'lib/foo.ts'),
    },
    {
      name: 'crm7 may upsert apprentice_rate_configs (shared)',
      code: "supabase.from('apprentice_rate_configs').upsert({ id: 1 });",
      filename: pathFor('crm7', 'lib/payroll/xeroAdapter.ts'),
    },
    // Profile self-write pattern — every app upserts the current user's own
    // row, so `profiles` is `shared` (RLS enforces self-only).
    {
      name: 'throughput may upsert profiles (self-write pattern)',
      code: "supabase.from('profiles').upsert({ user_id: 1, theme: 'dark' });",
      filename: pathFor('throughput', 'lib/auth/profileUtils.ts'),
    },
    {
      name: 'crm7 may upsert profiles (self-write pattern)',
      code: "supabase.from('profiles').update({ theme: 'dark' });",
      filename: pathFor('crm7', 'pages/profile.tsx'),
    },
    // Leads & tasks reclassified as shared per ownership-map.json; CRM7
    // edge function lead-capture is the canonical insert path, but BSU dev
    // dashboard + braden public site also write through it.
    {
      name: 'crm7 lead-capture function may insert leads (shared)',
      code: "supabase.from('leads').insert({ name: 'x' });",
      filename: pathFor('crm7', 'supabase/functions/lead-capture/index.ts'),
    },
    {
      name: 'braden may insert tasks (shared between braden + crm7)',
      code: "supabase.from('tasks').insert({ title: 'x' });",
      filename: pathFor('braden', 'lib/tasks.ts'),
    },
    // File outside any known app — rule no-ops.
    {
      name: 'unknown app — rule no-ops',
      code: "supabase.from('apprentices').insert({ id: 1 });",
      filename: '/tmp/bsuite-fixture/some-tool/src/foo.ts',
    },
    // Chained query-builder calls between .from() and the write should still
    // resolve to the same table.
    {
      name: 'long chain still resolves table to its own owner',
      code: "supabase.from('apprentices').select('*').eq('id', 1).update({ x: 2 });",
      filename: pathFor('crm7', 'lib/foo.ts'),
    },
    // Dynamic table name (variable) — rule cannot judge, so no-ops.
    {
      name: 'dynamic table name — rule no-ops',
      code: "const t = 'apprentices'; supabase.from(t).insert({ id: 1 });",
      filename: pathFor('throughput', 'lib/foo.ts'),
    },
    // Unknown table with default options — no report.
    {
      name: 'unknown table with default options is silent',
      code: "supabase.from('not_in_map').insert({ id: 1 });",
      filename: pathFor('crm7', 'lib/foo.ts'),
    },
  ],

  invalid: [
    // BSU writing to a CRM7-owned table — symmetrical V5 case for `clients`.
    {
      name: 'bsu writing to crm7-owned clients table',
      code: "await supabase.from('clients').insert({ name: 'x' });",
      filename: pathFor('business-suite-unified', 'lib/clientService.ts'),
      errors: [{ messageId: 'crossAppWrite', data: { app: 'bsu', method: 'insert', table: 'clients', owner: 'crm7' } }],
    },
    // Audit V6: BSU writing to ideas (Throughput-owned).
    {
      name: 'P1-2 BSU ideaService.ts — .from(ideas).update',
      code: "await supabase.from('ideas').update({ status: 'done' }).eq('id', 1);",
      filename: pathFor('business-suite-unified', 'lib/ideaService.ts'),
      errors: [{ messageId: 'crossAppWrite', data: { app: 'bsu', method: 'update', table: 'ideas', owner: 'throughput' } }],
    },
    // Audit V9: Throughput writing to team_members (BSU-owned).
    {
      name: 'P1-6 throughput teamPermissions.ts — .from(team_members).update',
      code: "await supabase.from('team_members').update({ role: 'admin' }).eq('id', 1);",
      filename: pathFor('throughput', 'lib/teamPermissions.ts'),
      errors: [{ messageId: 'crossAppWrite', data: { app: 'throughput', method: 'update', table: 'team_members', owner: 'bsu' } }],
    },
    // Conduit writing to a CRM7-owned table.
    {
      name: 'conduit writing apprentices — cross-app',
      code: "supabase.from('apprentices').insert({ id: 1 });",
      filename: pathFor('conduit', 'lib/foo.ts'),
      errors: [{ messageId: 'crossAppWrite', data: { app: 'conduit', method: 'insert', table: 'apprentices', owner: 'crm7' } }],
    },
    // CRM7 writing tenant_branding (BSU-owned per V7a).
    {
      name: 'crm7 writing tenant_branding — V7a violation',
      code: "supabase.from('tenant_branding').upsert({ tenant_id: 1, primary: 'red' });",
      filename: pathFor('crm7', 'pages/settings/branding.tsx'),
      errors: [{ messageId: 'crossAppWrite', data: { app: 'crm7', method: 'upsert', table: 'tenant_branding', owner: 'bsu' } }],
    },
    // Unknown table with warnOnUnknownTable enabled.
    {
      name: 'unknown table reports when warnOnUnknownTable=true',
      code: "supabase.from('totally_made_up').insert({ x: 1 });",
      filename: pathFor('crm7', 'lib/foo.ts'),
      options: [{ warnOnUnknownTable: true }],
      errors: [{ messageId: 'unknownTable', data: { table: 'totally_made_up', app: 'crm7', method: 'insert' } }],
    },
    // appOverride forces a specific app even if path detection would say otherwise.
    {
      name: 'appOverride forces detection',
      code: "supabase.from('award_rates').delete();",
      filename: '/tmp/foo/src/x.ts', // would otherwise be unknown app
      options: [{ appOverride: 'bsu' }],
      errors: [{ messageId: 'crossAppWrite', data: { app: 'bsu', method: 'delete', table: 'award_rates', owner: 'r80' } }],
    },
  ],
});
