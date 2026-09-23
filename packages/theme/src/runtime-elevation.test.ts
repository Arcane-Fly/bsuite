import { readFileSync } from 'node:fs';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';

const preset = readFileSync(new URL('./preset-v4.css', import.meta.url), 'utf8');

describe('runtime card elevation', () => {
  it.each([{ candidates: [] }, { candidates: ['shadow-elev-2'] }])('retains every selectable depth with $candidates', async ({ candidates }) => {
    const compiler = await compile(`${preset}\n@tailwind utilities;`);
    const css = compiler.build(candidates);

    // The page builder resolves a saved number to var(--shadow-elev-N).
    // No static utility class is present for most of these values.
    for (let depth = 0; depth <= 4; depth++) {
      expect(css).toMatch(new RegExp(`--shadow-elev-${depth}:\\s*[^;]+;`));
    }
  });

  it('keeps the utility role-bound and preserves the explicit zero-depth reset', async () => {
    const compiler = await compile(`${preset}\n@tailwind utilities;`);
    const css = compiler.build(['shadow-elev-0', 'shadow-elev-4']);
    expect(css).toContain('--shadow-elev-0: 0 0 0 0 transparent;');
    expect(css).toContain('var(--shadow-ink)');
    expect(css).toContain('var(--shadow-ink-faint)');
    expect(css).toContain('.shadow-elev-4');
    expect(css).not.toContain('--tw-shadow: none');
  });
});
