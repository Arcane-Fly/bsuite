import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noRawEntitySelectRule } from '../src/rules/no-raw-entity-select.js';

// Wire RuleTester to vitest globals so reporting flows through the test runner.
RuleTester.afterAll = afterAll;
RuleTester.it = it;
RuleTester.describe = describe;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('no-raw-entity-select', noRawEntitySelectRule, {
  valid: [
    // Canonical XSelector wrappers are skipped (matched by suffix).
    {
      name: 'ApprenticeSelector bound to personId is the canonical fix',
      code: '<ApprenticeSelector value={form.personId} onSelect={() => {}} />',
    },
    {
      name: 'EntitySelector bound to entity-id is allowed',
      code: '<EntitySelector value={form.contactId} table="contacts" />',
    },
    {
      name: 'ContactSelector bound to contactId',
      code: '<ContactSelector value={form.contactId} onSelect={() => {}} />',
    },
    // Non-entity Select usages must not be flagged.
    {
      name: 'Select bound to a non-entity status string is allowed',
      code: '<Select value={form.status}><option>open</option></Select>',
    },
    {
      name: 'Select bound to a non-id field is allowed',
      code: '<Select value={form.region}><option>WA</option></Select>',
    },
    // Filter ids that look superficially like entity ids but aren\'t can be
    // bypassed via inline comment + whatever escape the consumer chooses
    // (e.g. extracting the value through a different identifier).
    {
      name: 'Select bound to an opaque identifier the rule cannot read is allowed',
      code: '<Select value={someComputedValue()} />',
    },
  ],
  invalid: [
    {
      name: 'raw <Select> with personId fails',
      code: '<Select value={form.personId} onValueChange={() => {}} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with apprenticeId fails',
      code: '<Select value={form.apprenticeId} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with contactId fails',
      code: '<Select value={state.contactId} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with employer_id (snake_case) fails',
      code: '<Select value={row.employer_id} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <select> (HTML) with traineeId fails',
      code: '<select value={form.traineeId} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with hostEmployerId fails',
      code: '<Select value={form.hostEmployerId} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with mentorId fails',
      code: '<Select value={form.mentorId} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
    {
      name: 'raw <Select> with funding_source_id fails',
      code: '<Select value={row.funding_source_id} />',
      errors: [{ messageId: 'rawEntitySelect' }],
    },
  ],
});
