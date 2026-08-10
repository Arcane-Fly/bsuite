import { describe, expect, it } from 'vitest';
import { isRelationshipWritable } from '../relationshipCatalog.js';
import type { RelationshipCatalog } from '../types.js';

describe('isRelationshipWritable', () => {
  const catalog: RelationshipCatalog = [
    { hostEntityType: 'contact', fkColumn: 'client_id', targetEntityType: 'client' },
    { hostEntityType: 'person', fkColumn: 'current_host_employer_id', targetEntityType: 'client' },
  ];

  it('returns true when the host/fk/target triple is present in the catalogue', () => {
    expect(
      isRelationshipWritable(catalog, {
        hostEntityType: 'contact',
        fkColumn: 'client_id',
        targetEntityType: 'client',
      }),
    ).toBe(true);
  });

  it('returns false when the fk column does not match — a record with no matching FK is not writable', () => {
    expect(
      isRelationshipWritable(catalog, {
        hostEntityType: 'contact',
        fkColumn: 'employer_id',
        targetEntityType: 'client',
      }),
    ).toBe(false);
  });

  it('returns false when the host entity type is not in the catalogue at all', () => {
    expect(
      isRelationshipWritable(catalog, {
        hostEntityType: 'invoice',
        fkColumn: 'client_id',
        targetEntityType: 'client',
      }),
    ).toBe(false);
  });

  it('returns false when the target entity type does not match (same fk column, different target)', () => {
    expect(
      isRelationshipWritable(catalog, {
        hostEntityType: 'contact',
        fkColumn: 'client_id',
        targetEntityType: 'employer',
      }),
    ).toBe(false);
  });

  it('fails closed when no catalogue is supplied at all — undefined proves nothing writable', () => {
    expect(
      isRelationshipWritable(undefined, {
        hostEntityType: 'contact',
        fkColumn: 'client_id',
        targetEntityType: 'client',
      }),
    ).toBe(false);
  });

  it('fails closed on an empty catalogue', () => {
    expect(
      isRelationshipWritable([], {
        hostEntityType: 'contact',
        fkColumn: 'client_id',
        targetEntityType: 'client',
      }),
    ).toBe(false);
  });
});
