import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * EVERY CUSTOM PROPERTY WE BIND MUST BE ONE THE LIBRARY ACTUALLY READS.
 *
 * `@xyflow/react` exposes two spellings of most theme variables — a `-props`
 * layer it chains first, and a plain one it falls back to. The chaining is NOT
 * uniform. On 12.11.2 the Controls button's BASE background is declared
 *
 *     background: var(--xy-controls-button-background-color,
 *                     var(--xy-controls-button-background-color-default))
 *
 * with no `-props` in the chain at all, while its hover counterpart, all five
 * minimap properties, and the button's colour and border-color all chain it.
 *
 * So binding `--xy-controls-button-background-color-props` set a variable
 * nothing ever read, and the control rendered the library default (#2b2b2b in
 * dark) — measured at 1.19:1 against its icon. Nine of ten bindings worked,
 * which is precisely why it survived review: the object looked right, the
 * tokens were correct, and the ONE that did nothing was invisible without
 * measuring the rendered result.
 *
 * This test re-derives that audit from the INSTALLED stylesheet on every run,
 * so an xyflow upgrade that moves a property in or out of the `-props` layer
 * fails here instead of silently un-theming a control.
 *
 * It does NOT skip when the stylesheet is missing. A guard that skips what it
 * cannot read reports coverage it does not have, and `@xyflow/react` is a
 * devDependency of this package — absent means the environment is wrong, which
 * is a finding, not a reason to pass.
 */
describe('XY_TOKEN_BINDINGS are read by the installed @xyflow/react', () => {
  // Resolve from the package root (vitest's cwd), not from `import.meta.url`
  // — under the vitest transform that is not a `file:` URL and `new URL()`
  // throws before a single assertion runs, which presents as "no tests" rather
  // than as a failure. A suite that cannot load is not a suite that passed.
  const require_ = createRequire(resolve(process.cwd(), 'package.json'));
  const cssPath = require_.resolve('@xyflow/react/dist/style.css');
  const sourcePath = resolve(process.cwd(), 'src/components/SchemaCanvas.tsx');
  if (!existsSync(sourcePath)) {
    throw new Error(`SchemaCanvas.tsx not found at ${sourcePath} — the audit cannot run`);
  }
  const css = readFileSync(cssPath, 'utf8');
  const source = readFileSync(sourcePath, 'utf8');

  const bindingBlock = source.slice(source.indexOf('XY_TOKEN_BINDINGS'));
  const bound = [...bindingBlock.matchAll(/'(--xy-[a-z0-9-]+)'\s*:/g)].map((m) => m[1]);

  /** Does the stylesheet ever look this property up? */
  const isRead = (name: string) =>
    css.includes(`var(${name},`) ||
    css.includes(`var(\n    ${name},`) ||
    // tolerate arbitrary whitespace/newlines inside the var() call
    new RegExp(`var\\(\\s*${name.replace(/-/g, '\\-')}\\s*,`).test(css);

  it('binds at least the properties this canvas themes', () => {
    // A non-zero denominator, asserted before any per-item verdict. Without it
    // a regex that stopped matching would report "all bindings fine".
    expect(bound.length).toBeGreaterThanOrEqual(10);
  });

  it.each(bound.map((b) => [b] as const))(
    '%s is read by the stylesheet, or its plain counterpart is bound too',
    (name) => {
      if (isRead(name)) return;
      expect(
        name.endsWith('-props') && bound.includes(name.slice(0, -'-props'.length)),
        `${name} is INERT: the installed @xyflow/react stylesheet never looks it up, and ` +
          `the plain '${name.replace(/-props$/, '')}' is not bound either, so this token ` +
          `silently renders the library default.`,
      ).toBe(true);
    },
  );

  it('the Controls button base background is bound in the spelling the CSS reads', () => {
    // The specific regression, pinned by name so a future refactor that drops
    // the plain binding fails with the reason rather than a generic mismatch.
    expect(bound).toContain('--xy-controls-button-background-color');
  });
});
