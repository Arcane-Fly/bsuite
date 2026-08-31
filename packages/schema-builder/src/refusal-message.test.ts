/**
 * The refusal message must name the real cause.
 *
 * Until 2026-09-01 every refusal rendered as "No physical table exists for this
 * entity; only the metadata name will change." Both halves were untrue for the
 * common case: the RPC returned `no_physical_table` for ANY unregistered entity
 * and its allowlist ships empty, so that was the answer for every entity while the
 * table usually did exist; and the handler returns without renaming metadata, so
 * nothing was renamed at all.
 *
 * A message naming the wrong cause is worse than a vague one — it sends the user
 * to fix something that was never broken. These assert the specific claims rather
 * than that a string exists.
 */
import { describe, expect, it } from 'vitest';

import { refusalMessage } from './components/FieldEditDialog.js';

describe('refusalMessage', () => {
  it('tells an unregistered-table user it can be registered, and does not claim the table is missing', () => {
    const m = refusalMessage('table_not_registered');
    expect(m.includes('not registered')).toBe(true);
    expect(m.includes('platform developer')).toBe(true);
    // The old lie: asserting the table does not exist.
    expect(m.includes('no physical database table')).toBe(false);
  });

  it('tells a genuinely table-less entity there is no column, without offering registration', () => {
    const m = refusalMessage('no_physical_table');
    expect(m.includes('no physical database table')).toBe(true);
    expect(m.includes('platform developer')).toBe(false);
  });

  it('never claims a metadata rename happened, because this branch performs none', () => {
    for (const r of ['table_not_registered', 'no_physical_table', undefined, 'anything_else']) {
      expect(refusalMessage(r).includes('only the metadata name will change')).toBe(false);
    }
  });

  it('always states the column was left unchanged or renamed nothing', () => {
    for (const r of ['table_not_registered', 'no_physical_table', 'anything_else']) {
      const m = refusalMessage(r);
      expect(m.includes('unchanged') || m.includes('no column to rename')).toBe(true);
    }
  });

  it('falls back to a vague but TRUE message for an unknown reason', () => {
    const m = refusalMessage('something_new_from_a_later_migration');
    expect(m.includes('did not run')).toBe(true);
    expect(m.includes('left unchanged')).toBe(true);
  });
});
