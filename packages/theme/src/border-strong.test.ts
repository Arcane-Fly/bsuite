import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const preset = readFileSync(new URL('./preset-v4.css', import.meta.url), 'utf8');

// bsuite#3301 reformatted the bg-sunken line and dropped --color-border-strong with
// it. Published first in 1.5.3; crm7 then emitted no border-border-strong, so
// document-editor table borders and onboarding hover borders lost their colour on
// production (C10 crm7 7 -> 16, 2026-09-26).
describe('border-strong utility', () => {
  it('is emitted and bound to the role token', async () => {
    const compiler = await compile(`${preset}\n@tailwind utilities;`);
    const css = compiler.build(['border-border-strong', 'hover:border-border-strong']);
    expect(css).toContain('.border-border-strong');
    // @theme inline: the utility reads the role token directly.
    expect(css).toContain('var(--role-border-strong)');
    expect(preset).toMatch(/--color-border-strong:\s*var\(--role-border-strong\);/);
  });
});
