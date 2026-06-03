import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noUuidInputPlaceholderRule } from '../src/rules/no-uuid-input-placeholder.js';

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

const PAGE_PATH = '/repo/crm7/src/pages/whs/return-to-work/create.tsx';

ruleTester.run('no-uuid-input-placeholder', noUuidInputPlaceholderRule, {
  valid: [
    {
      name: 'Input with a non-UUID placeholder is fine',
      filename: PAGE_PATH,
      code: `<Input placeholder="Apprentice name" />`,
    },
    {
      name: 'Input with no placeholder attribute is fine',
      filename: PAGE_PATH,
      code: `<Input value={x} onChange={() => {}} />`,
    },
    {
      name: 'Other components are not matched (Select, Combobox)',
      filename: PAGE_PATH,
      code: `<Select placeholder="Pick a UUID" />`,
    },
    {
      name: 'Form.Input with non-UUID placeholder is fine',
      filename: PAGE_PATH,
      code: `<Form.Input placeholder="Search by name" />`,
    },
    {
      name: 'Test files are skipped (__tests__ path fragment)',
      filename: '/repo/crm7/src/pages/__tests__/whs.test.tsx',
      code: `<Input placeholder="UUID of host employer" />`,
    },
    {
      name: 'Spec files are skipped',
      filename: '/repo/crm7/src/pages/whs.spec.tsx',
      code: `<Input placeholder="Enter apprentice UUID" />`,
    },
    {
      name: 'Stories files are skipped',
      filename: '/repo/crm7/src/components/Foo.stories.tsx',
      code: `<Input placeholder="Apprentice UUID" />`,
    },
    {
      name: 'Dynamic placeholder (variable reference) is not flagged — false-positives are worse than false-negatives',
      filename: PAGE_PATH,
      code: `<Input placeholder={UUID_LABEL} />`,
    },
    {
      name: 'Template literal with interpolation is not flagged (dynamic)',
      filename: PAGE_PATH,
      code: 'const x = "y"; <Input placeholder={`UUID of ${x}`} />',
    },
    {
      name: 'Word fragment "UUIDish" does not trigger (whole-word match)',
      filename: PAGE_PATH,
      code: `<Input placeholder="UUIDish identifier" />`,
    },
    {
      name: '"GUID" is not "UUID" — different acronym, different rule',
      filename: PAGE_PATH,
      code: `<Input placeholder="Enter GUID" />`,
    },
  ],
  invalid: [
    {
      name: 'placeholder="UUID of host employer" fails',
      filename: PAGE_PATH,
      code: `<Input placeholder="UUID of host employer" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'placeholder="Enter apprentice UUID" fails',
      filename: PAGE_PATH,
      code: `<Input placeholder="Enter apprentice UUID" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'placeholder="Enter plan UUID…" fails (with ellipsis)',
      filename: PAGE_PATH,
      code: `<Input placeholder="Enter plan UUID…" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'lowercase HTML <input> is also flagged',
      filename: PAGE_PATH,
      code: `<input placeholder="UUID of inspector" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: '<Textarea> is also flagged',
      filename: PAGE_PATH,
      code: `<Textarea placeholder="Apprentice UUID, comma-separated" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'Member-expression tag <Form.Input> is flagged',
      filename: PAGE_PATH,
      code: `<Form.Input placeholder="UUID of the related complaint" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'expression-container literal `placeholder={"UUID..."}` is flagged',
      filename: PAGE_PATH,
      code: `<Input placeholder={"UUID or name lookup"} />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'plain template literal (no interpolation) is flagged',
      filename: PAGE_PATH,
      code: '<Input placeholder={`Enter UUID of host employer`} />',
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
    {
      name: 'lowercase "uuid" still triggers (case-insensitive match)',
      filename: PAGE_PATH,
      code: `<Input placeholder="paste uuid here" />`,
      errors: [{ messageId: 'uuidPlaceholder' }],
    },
  ],
});
