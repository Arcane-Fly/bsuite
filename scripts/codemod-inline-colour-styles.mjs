#!/usr/bin/env node
/**
 * Convert inline colour styles to theme utilities.
 *
 * WHY THIS EXISTS
 * An inline `style` attribute beats EVERY layer, utility and class — it is the top of
 * the cascade short of !important. So each one is a hole in the design system that no
 * static gate can see:
 *
 *   · The crm7 Dashboard title carried `style={{ color: 'var(--text-heading)' }}`. It
 *     defeated the heading ramp outright and would have defeated the gradient that
 *     replaced it. The operator saw a flat heading; every gate reported clean.
 *   · These bind a PARALLEL vocabulary — --text-primary/-secondary/-muted/-heading —
 *     while the package owns --role-text-*. Same concepts under different names, so
 *     the ownership gate compares names and finds nothing. Same blind spot that let
 *     braden ship two different golds on one page.
 *
 * WHY IT IS SAFE
 * crm7's local values are numerically IDENTICAL to the package's for the tiers that
 * matter (0.22 0.015 260 / 0.38 0.018 260 / 0.52 0.018 260 / 0.60 0.012 260). This is
 * an ownership change, not a colour change — with one deliberate exception:
 * --text-heading becomes the ramp's h1 colour, because a heading pinned to a flat
 * value is precisely what the ramp exists to own.
 *
 * WHAT IT REFUSES TO TOUCH — each of these would be a plausible-looking wrong answer
 *   · Any style attribute where even ONE property is not convertible. Converting half
 *     an attribute and leaving the rest is how you get a half-styled element.
 *   · Non-static values: conditionals, template literals, var() fallbacks, variables.
 *     A class cannot express a value computed at runtime.
 *   · Any token without an EXACT utility. A guessed mapping produces a colour that
 *     looks right and is wrong, which is the hardest kind of error to catch later.
 *
 * Usage: node scripts/codemod-inline-colour-styles.mjs <app> [--apply]
 *        Default is a DRY RUN that writes nothing.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const app = process.argv[2];
const APPLY = process.argv.includes('--apply');
if (!app) { console.error('usage: codemod-inline-colour-styles.mjs <app> [--apply]'); process.exit(2); }

// Semantic text colours. These bind the *-text variants because crm7/BSU's
// --color-* tokens were repointed at --role-*-text on 2026-08-04 — so the
// utility and the token now resolve to the SAME value, which is what makes this
// conversion value-neutral rather than a redesign.
const COLOR = {
  '--color-error': 'text-error-text',
  '--color-success': 'text-success-text',
  '--color-warning': 'text-warning-text',
  '--color-info': 'text-info-text',
  '--text-primary': 'text-body',
  '--text-secondary': 'text-secondary',
  '--text-heading': 'text-heading',
  '--text-muted': 'text-muted',
  '--text-subtle': 'text-subtle',
  '--text-disabled': 'text-disabled',
  '--role-text-body': 'text-body',
  '--role-text-secondary': 'text-secondary',
  '--role-text-heading': 'text-heading',
  '--role-text-muted': 'text-muted',
  '--role-text-subtle': 'text-subtle',
};
const BG = {
  '--color-error-bg': 'bg-role-error/10',
  '--color-success-bg': 'bg-role-success/10',
  '--color-warning-bg': 'bg-role-warning/10',
  '--color-info-bg': 'bg-role-info/10',
  '--bg-tertiary': 'bg-sunken',
  '--bg-body': 'bg-body', '--bg-surface': 'bg-surface', '--bg-panel': 'bg-panel',
  '--bg-sunken': 'bg-sunken', '--bg-input': 'bg-input',
  '--role-bg-body': 'bg-body', '--role-bg-surface': 'bg-surface',
  '--role-bg-panel': 'bg-panel', '--role-bg-sunken': 'bg-sunken',
};

const BORDER = {
  '--color-error-border': 'border-role-error/30',
  '--color-success-border': 'border-role-success/30',
  '--color-warning-border': 'border-role-warning/30',
  '--color-info-border': 'border-role-info/30',
  '--role-border': 'border-border',
};

// execFileSync with an argument array: no shell, so nothing in `app` can be
// interpreted as a shell metacharacter.
let files = [];
try {
  files = execFileSync('grep', ['-rl', 'style={{', `${app}/src`, '--include=*.tsx'], { encoding: 'utf8' })
    .split('\n').filter(Boolean);
} catch { files = []; }

let converted = 0, filesTouched = 0;
const skips = {};
const samples = [];
const bump = (k) => { skips[k] = (skips[k] || 0) + 1; };

/** Return the utility classes for a style body, or null if ANY part is unconvertible. */
function classesFor(body) {
  const props = body.split(',').map((s) => s.trim()).filter(Boolean);
  if (!props.length) return null;
  const out = [];
  for (const prop of props) {
    const m = /^(color|backgroundColor|background|borderColor)\s*:\s*['"`]var\((--[a-z0-9-]+)\)['"`]$/.exec(prop);
    if (!m) { bump('non-static value or unsupported property'); return null; }
    // Route by the PROPERTY, not just "is it background". `borderColor` needs the
    // border-* table; sending it through BG would have produced a bg-* class that
    // paints the whole element instead of its edge — a wrong answer that still
    // compiles, which is the kind this codemod exists to avoid.
    const table = m[1] === 'color' ? COLOR : m[1] === 'borderColor' ? BORDER : BG;
    const util = table[m[2]];
    if (!util) { bump(`no exact utility for ${m[2]}`); return null; }
    out.push(util);
  }
  return out;
}

for (const file of files) {
  const before = readFileSync(file, 'utf8');
  let src = before;

  // Operate on a WHOLE JSX opening tag as one unit, so className and style are
  // rewritten together and a partial edit is impossible.
  src = src.replace(/<([A-Za-z][\w.]*)((?:[^<>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?)(\/?)>/g,
    (whole, tag, attrs, selfClose) => {
      const styleM = /\sstyle=\{\{([^{}]*)\}\}/.exec(attrs);
      if (!styleM) return whole;
      const classes = classesFor(styleM[1]);
      if (!classes) return whole;

      let next = attrs.replace(styleM[0], '');
      const cls = classes.join(' ');

      const strM = /className="([^"]*)"/.exec(next);
      if (strM) {
        next = next.replace(strM[0], `className="${strM[1]} ${cls}"`);
      } else if (/className=\{cn\(/.test(next)) {
        next = next.replace(/className=\{cn\(/, `className={cn('${cls}', `);
      } else if (/className=\{/.test(next)) {
        bump('className is a non-cn expression — left for a human');
        return whole;
      } else {
        next = `${next.replace(/\s+$/, '')} className="${cls}"`;
      }

      converted += classes.length;
      if (samples.length < 5) {
        samples.push(`${file}\n      - ${styleM[0].trim()}\n      + ${cls}`);
      }
      return `<${tag}${next}${selfClose}>`;
    });

  if (src !== before) {
    filesTouched++;
    if (APPLY) writeFileSync(file, src);
  }
}

console.log(`\n${app}${APPLY ? '' : '   (DRY RUN — nothing written)'}`);
console.log(`  converted:  ${converted} bindings across ${filesTouched} files`);
const left = Object.values(skips).reduce((a, b) => a + b, 0);
console.log(`  left alone: ${left}`);
for (const [r, n] of Object.entries(skips).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`     ${String(n).padStart(4)}  ${r}`);
}
if (samples.length) { console.log('\n  samples:'); samples.forEach((s) => console.log(`    ${s}`)); }
