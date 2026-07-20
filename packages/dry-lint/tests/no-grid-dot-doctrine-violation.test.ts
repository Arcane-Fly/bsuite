import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';

import { noGridDotDoctrineViolationRule } from '../src/rules/no-grid-dot-doctrine-violation.js';

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

ruleTester.run('no-grid-dot-doctrine-violation', noGridDotDoctrineViolationRule, {
  valid: [
    // (a) HeroGrid on a public marketing surface — correct context.
    {
      name: 'HeroGrid on a public landing page is allowed',
      code: '<div className="relative"><HeroGrid /></div>',
      filename: 'src/pages/marketing/Landing.tsx',
    },
    {
      name: 'HeroGrid inside a (public) route group is allowed',
      code: '<HeroGrid />',
      filename: 'src/app/(public)/page.tsx',
    },
    // (b) DotPattern on an authenticated shell — correct context.
    {
      name: 'DotPattern inside a DashboardShell is allowed',
      code: '<DotPattern />',
      filename: 'src/components/DashboardShell.tsx',
    },
    {
      name: 'DotPattern inside /portal/ is allowed',
      code: '<DotPattern />',
      filename: 'src/pages/portal/Overview.tsx',
    },
    // (c) canonical primitives' own source may define the pattern.
    {
      name: 'the DotPattern primitive source itself is exempt from the hand-rolled check',
      code: "const s = { backgroundImage: 'radial-gradient(circle, red 1px, transparent 1px)' };",
      filename: 'packages/ui/src/dot-pattern.tsx',
    },
    {
      name: 'the HeroGrid primitive source itself is exempt from the hand-rolled check',
      code: "const s = { background: 'linear-gradient(90deg, black 1px, transparent 1px)' };",
      filename: 'packages/ui/src/hero-grid.tsx',
    },
    {
      name: 'the theme package CSS-defining source is exempt',
      code: "const s = { background: 'linear-gradient(90deg, black 1px, transparent 1px)' };",
      filename: 'packages/theme/src/css-in-js/legacy.ts',
    },
    // Unrelated backgroundImage values are never flagged.
    {
      name: 'a normal backgroundImage (photo url) is not flagged',
      code: "const s = { backgroundImage: 'url(/hero.jpg)' };",
      filename: 'src/components/Hero.tsx',
    },
    // No JSX tag match at all.
    {
      name: 'unrelated components are ignored entirely',
      code: '<div className="grid"><SomeOtherThing /></div>',
      filename: 'src/pages/dashboard/Overview.tsx',
    },
  ],
  invalid: [
    // (a) grid inside an authenticated shell.
    {
      name: 'HeroGrid inside /dashboard/ is flagged',
      code: '<HeroGrid />',
      filename: 'src/pages/dashboard/Overview.tsx',
      errors: [{ messageId: 'gridInAuthedShell' }],
    },
    {
      name: 'HeroGrid inside an AppShell component is flagged',
      code: '<HeroGrid />',
      filename: 'src/components/AppShell.tsx',
      errors: [{ messageId: 'gridInAuthedShell' }],
    },
    // (b) dots on a public hero.
    {
      name: 'DotPattern inside /marketing/ is flagged',
      code: '<DotPattern />',
      filename: 'src/pages/marketing/Landing.tsx',
      errors: [{ messageId: 'dotOnPublicHero' }],
    },
    {
      name: 'DotPattern inside a LandingHero component is flagged',
      code: '<DotPattern />',
      filename: 'src/components/marketing/LandingHero.tsx',
      errors: [{ messageId: 'dotOnPublicHero' }],
    },
    // (c) hand-rolled dot pattern outside the primitive's own source.
    {
      name: 'hand-rolled radial-gradient dot pattern in a consumer component is flagged',
      code: "const style = { backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)' };",
      filename: 'src/components/marketing/CustomHero.tsx',
      errors: [{ messageId: 'handRolledPattern' }],
    },
    // (c) hand-rolled grid pattern (two-axis linear-gradient) outside the primitive.
    {
      name: 'hand-rolled two-axis linear-gradient grid pattern in a consumer component is flagged',
      code: "const style = { backgroundImage: 'linear-gradient(black 1px, transparent 1px), linear-gradient(90deg, black 1px, transparent 1px)' };",
      filename: 'src/components/marketing/CustomHero.tsx',
      errors: [{ messageId: 'handRolledPattern' }],
    },
    // (c) same signature, kebab-case CSS-in-JS string key form.
    {
      name: 'hand-rolled pattern via kebab-case "background-image" key is flagged',
      code: "const style = { 'background-image': 'radial-gradient(circle, red 1px, transparent 1px)' };",
      filename: 'src/components/marketing/CustomHero.tsx',
      errors: [{ messageId: 'handRolledPattern' }],
    },
  ],
});
