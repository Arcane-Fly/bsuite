import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * THE ENTITY CARD MUST SEPARATE FROM THE CANVAS IN DARK MODE.
 *
 * `shadow-md` is achromatic ink. On a dark canvas it resolves to ambient
 * shadow at chroma 0.0166 — below the 0.05 floor a glow has to clear to read
 * as separation — so all 45 entity cards rendered flat, distinguished only by
 * their border. A shadow tuned for a light canvas is not a weaker effect on a
 * dark one; it is no effect.
 *
 * Asserted against the SOURCE rather than a render because the defect is which
 * utility is emitted, and jsdom computes no box-shadow for a Tailwind class it
 * never compiled — a render test here would pass on the broken code, which is
 * the failure mode this file exists to avoid.
 */
describe('EntityNode separates from the canvas in dark mode', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/EntityNode.tsx'),
    'utf8',
  );

  it('applies the accent-derived glow under the dark variant', () => {
    expect(source).toContain('dark:shadow-[var(--glow-card,none)]');
  });

  it('keeps the light-mode shadow rather than replacing it', () => {
    // `--glow-card` is `none` at :root, so an unguarded swap would leave light
    // mode with no elevation at all.
    expect(source).toContain('shadow-md dark:shadow-[var(--glow-card,none)]');
  });

  it('does not reintroduce a bare achromatic shadow on the card root', () => {
    const rootLine = source
      .split('\n')
      .find((l) => l.includes('relative min-w-[240px] rounded-xl border bg-card'));
    expect(rootLine, 'card root className not found — this guard is measuring nothing').toBeTruthy();
    expect(rootLine).toContain('dark:shadow-');
  });
});
