import { describe, expect, it } from 'vitest';

import { assertOwnershipEntryValid } from '../src/rules/no-cross-app-write.js';

/**
 * PHASE-3c (@bsuite/dry-lint@0.2.0) schema validation tests for the
 * ownership-map entry shape. The validator runs at module load on every entry
 * in `src/ownership-map.json`; these tests exercise it directly with crafted
 * inputs.
 *
 * Schema rules:
 *  1. Each entry uses EXACTLY ONE of `owner` or `writers`.
 *  2. `writers` (when used) must be a non-empty array.
 *  3. A single-element `writers: ["bsu"]` is *valid* but semantically
 *     equivalent to `owner: "bsu"` — prefer the latter for clarity.
 */
describe('ownership-map schema (assertOwnershipEntryValid)', () => {
  it('owner_and_writers_rejected_by_schema', () => {
    expect(() =>
      assertOwnershipEntryValid('mixed_entry', {
        // @ts-expect-error — intentionally malformed for test
        owner: 'invalid',
        writers: ['bsu', 'crm7'],
        readers: [],
      }),
    ).toThrow(/mutually exclusive/);
  });

  it('rejects entries with neither owner nor writers', () => {
    expect(() =>
      // @ts-expect-error — intentionally malformed for test
      assertOwnershipEntryValid('empty_entry', { readers: [] }),
    ).toThrow(/must have either "owner" or "writers"/);
  });

  it('rejects empty writers list', () => {
    expect(() =>
      assertOwnershipEntryValid('empty_writers', {
        writers: [],
        readers: [],
      }),
    ).toThrow(/empty "writers" list/);
  });

  it('accepts owner-only entry (existing schema)', () => {
    expect(() =>
      assertOwnershipEntryValid('owner_only', {
        owner: 'bsu',
        readers: ['crm7'],
      }),
    ).not.toThrow();
  });

  it('accepts writers-only entry (PHASE-3c multi-writer)', () => {
    expect(() =>
      assertOwnershipEntryValid('writers_only', {
        writers: ['bsu', 'crm7'],
        readers: ['r80'],
      }),
    ).not.toThrow();
  });

  it('accepts single-writer entry (semantically equivalent to owner)', () => {
    // Documented edge case: `writers: ["bsu"]` is valid syntactically; using
    // `owner: "bsu"` is preferred for clarity but the rule treats both as
    // "only bsu may write" so it shouldn't throw.
    expect(() =>
      assertOwnershipEntryValid('single_writer', {
        writers: ['bsu'],
        readers: [],
      }),
    ).not.toThrow();
  });

  it('accepts shared owner (audit-sink pattern)', () => {
    expect(() =>
      assertOwnershipEntryValid('audit_sink', {
        owner: 'shared',
        readers: [],
      }),
    ).not.toThrow();
  });

  it('accepts all owner (event sink)', () => {
    expect(() =>
      assertOwnershipEntryValid('event_sink', {
        owner: 'all',
        readers: ['bsu'],
      }),
    ).not.toThrow();
  });
});
