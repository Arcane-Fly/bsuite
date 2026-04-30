import { describe, it, expect } from 'vitest';
import {
  applyFieldMappings,
  autoDetectMappings,
  type FieldMapping,
  type FieldTarget,
} from '../mappings.js';

describe('applyFieldMappings', () => {
  const mappings: FieldMapping[] = [
    { sourceField: 'First Name', targetField: 'first_name' },
    { sourceField: 'Email Address', targetField: 'email' },
  ];

  it('renames keys per the mappings', () => {
    const rows = [
      { 'First Name': 'Ada', 'Email Address': 'ada@example.com' },
      { 'First Name': 'Grace', 'Email Address': 'grace@example.com' },
    ];
    expect(applyFieldMappings(rows, mappings)).toEqual([
      { first_name: 'Ada', email: 'ada@example.com' },
      { first_name: 'Grace', email: 'grace@example.com' },
    ]);
  });

  it('drops source fields without a mapping', () => {
    const rows = [{ 'First Name': 'Ada', 'Ignored Field': 'x' }];
    expect(applyFieldMappings(rows, mappings)).toEqual([{ first_name: 'Ada' }]);
  });

  it('omits target fields whose source key is missing', () => {
    const rows = [{ 'First Name': 'Ada' }];
    expect(applyFieldMappings(rows, mappings)).toEqual([{ first_name: 'Ada' }]);
  });

  it('returns empty objects for empty mapping array', () => {
    expect(applyFieldMappings([{ a: 1 }], [])).toEqual([{}]);
  });

  it('ignores prototype-pollution source keys (checked via hasOwnProperty)', () => {
    const evilRow = Object.create(null) as Record<string, unknown>;
    evilRow['safe'] = 'ok';
    const mapping: FieldMapping[] = [{ sourceField: 'safe', targetField: 'result' }];
    expect(applyFieldMappings([evilRow], mapping)).toEqual([{ result: 'ok' }]);
  });
});

describe('autoDetectMappings', () => {
  const targets: FieldTarget[] = [
    { label: 'First Name', value: 'first_name' },
    { label: 'Email Address', value: 'email' },
    { label: 'Phone Number', value: 'phone' },
  ];

  it('matches by target value (normalised)', () => {
    expect(autoDetectMappings(['first_name'], targets)).toEqual([
      { sourceField: 'first_name', targetField: 'first_name' },
    ]);
  });

  it('matches case-insensitively ignoring whitespace/underscore/dash', () => {
    expect(autoDetectMappings(['First-Name', 'email address', 'Phone_Number'], targets)).toEqual([
      { sourceField: 'First-Name', targetField: 'first_name' },
      { sourceField: 'email address', targetField: 'email' },
      { sourceField: 'Phone_Number', targetField: 'phone' },
    ]);
  });

  it('prefers value match over label match', () => {
    // Value wins because normalised source 'email' === normalised value 'email'.
    const result = autoDetectMappings(['email'], targets);
    expect(result).toEqual([{ sourceField: 'email', targetField: 'email' }]);
  });

  it('skips headers with no match', () => {
    expect(autoDetectMappings(['first_name', 'zodiac_sign'], targets)).toEqual([
      { sourceField: 'first_name', targetField: 'first_name' },
    ]);
  });

  it('returns empty array for empty inputs', () => {
    expect(autoDetectMappings([], targets)).toEqual([]);
    expect(autoDetectMappings(['any'], [])).toEqual([]);
  });
});
