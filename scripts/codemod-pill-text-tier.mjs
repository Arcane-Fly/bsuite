#!/usr/bin/env node
/**
 * CODEMOD — a tinted pill must not label itself with its own fill colour.
 *
 * THE DEFECT
 *
 * The estate is full of status pills written as `bg-destructive/10
 * text-destructive`: a 10% wash of a colour, captioned in that same colour at
 * full strength. It reads as deliberate — one token, one hue, tidy. It is the
 * single largest legibility failure in the codebase.
 *
 * The fill tokens (`--role-primary`, `--role-destructive`, …) are mixed to sit
 * UNDER a white button label. They are chosen for saturation, not for
 * readability as type. Measured on the live pages with scripts/audit-legibility:
 *
 *     bg-destructive/10 text-destructive   3.82:1 dark   3.64:1 light
 *     bg-primary/10     text-primary       3.29:1 dark
 *     bg-success/10     text-success       pass  dark    4.07:1 light
 *     bg-warning/10     text-warning       pass  dark    4.11:1 light
 *
 * against a 4.5:1 floor. Note the pattern: dark mode partially rescues success
 * and warning because their dark fills are already light (L 0.67, L 0.80), so
 * a dark-only sweep declares two of the four clean. They are not. Every one of
 * these pairings fails in light mode. Auditing a single theme would have fixed
 * half the problem and closed the ticket.
 *
 * THE FIX
 *
 * @bsuite/theme already ships the correct token for this and says so in
 * preset-v4.css: "AA-safe text variants — the only correct token for coloured
 * type. A saturated fill colour is not a legible text colour." Each is tuned
 * per mode (≈4.7:1 light, ≥7:1 dark). Nothing new is invented here; this
 * codemod only stops components reaching past a token that already exists.
 *
 * WHY IT MATCHES ON THE STRING, NOT THE FILE
 *
 * The rewrite fires only when one class string carries BOTH `bg-<k>/<n>` and
 * `text-<k>`. That co-occurrence is what identifies a pill. A bare
 * `text-destructive` elsewhere may be sitting on a plain background where the
 * fill token is defensible, and a bare `bg-destructive/10` may hold an icon
 * with no type in it at all — neither is touched. Ternary branches are separate
 * string literals, so `isActive ? 'bg-primary/10 text-primary' : 'text-muted'`
 * rewrites the active branch and leaves the other alone.
 *
 * TOKEN BOUNDARIES ARE NOT WORD BOUNDARIES
 *
 * `\btext-primary\b` matches inside `text-primary-foreground`, because `-` is a
 * non-word character and therefore IS a word boundary. That would recolour
 * every filled button label in the estate to a low-saturation text tone. The
 * boundary here is `(?![-\w])` — refuse to match when another name segment
 * follows. This exact trap already cost a full audit once.
 *
 * --bare: THE SECOND PASS, AND IT IS DELIBERATELY NARROWER THAN IT LOOKS
 *
 * A fill token used as type is wrong whether or not there is a tint behind it
 * — conduit's active tab is `border-primary text-primary` on a plain card and
 * measured 3.57:1. But a blind sweep of every bare `text-primary` is the wrong
 * instrument, for one reason: most of them are ICONS.
 *
 *   <Users className="h-4 w-4 text-primary" />
 *
 * An icon is a graphic. WCAG asks 3:1 of it, not 4.5:1, and `text-primary`
 * measures 3.57:1 — it PASSES. Recolouring it would dull a brand accent to fix
 * a defect that is not there. Across the estate that is 569 sites of pure
 * churn and visible design regression.
 *
 * So --bare fires only where the class string also carries a TYPOGRAPHIC
 * signal — a text- size, a font- weight, uppercase, tracking-, leading-,
 * truncate, line-clamp. Those identify an element that renders words. Strings
 * with neither signal (a bare `text-primary` with no size and no dimensions)
 * are left alone: ambiguous, and the live gate will catch them if they fail.
 *
 * Usage: node scripts/codemod-pill-text-tier.mjs <app-dir> [--write] [--bare]
 *        (default is a dry run that prints every rewrite it would make)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

// fill token as written -> the AA-safe text token that replaces it
const TIER = new Map([
  ['primary', 'primary-text'],
  ['destructive', 'error-text'],
  ['error', 'error-text'],
  ['success', 'success-text'],
  ['warning', 'warning-text'],
  ['accent', 'accent-text'],
  ['info', 'info-text'],
]);

// `bg-(--color-success)/10 text-(--color-success)` is the same defect written
// in Tailwind v4 arbitrary-property syntax, and is just as common.
const ARBITRARY = new Map([
  ['--color-success', 'success-text'],
  ['--color-warning', 'warning-text'],
  ['--color-error', 'error-text'],
  ['--color-destructive', 'error-text'],
  ['--color-info', 'info-text'],
  ['--color-primary', 'primary-text'],
]);

// An element that renders words says so in its own class list.
const TYPOGRAPHIC =
  /\btext-(xs|sm|base|lg|xl|\dxl|\[\d+(px|rem)\])|\bfont-(thin|light|normal|medium|semibold|bold|extrabold|black)|\buppercase\b|\btracking-|\bleading-|\btruncate\b|\bline-clamp-/;

const root = process.argv[2];
const write = process.argv.includes('--write');
const bare = process.argv.includes('--bare');
if (!root) { console.error('usage: codemod-pill-text-tier.mjs <app-dir> [--write]'); process.exit(2); }

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    if (e === 'node_modules' || e === '.next' || e === 'dist' || e === '.vercel') continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p);
    else if (['.tsx', '.ts', '.jsx'].includes(extname(p))) files.push(p);
  }
})(root);

// One quoted string literal at a time — a class list never spans two of them.
const LITERAL = /"[^"\n]*"|'[^'\n]*'|`[^`]*`/g;

let touched = 0, edits = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  let hits = 0;
  const out = src.replace(LITERAL, (lit) => {
    let s = lit;
    for (const [fill, tier] of TIER) {
      const tinted = new RegExp(`bg-${fill}/\\d+(?![-\\w])`).test(s);
      if (!tinted) continue;
      const txt = new RegExp(`(^|[\\s:'"\`])text-${fill}(?![-\\w])`, 'g');
      s = s.replace(txt, (m, pre) => { hits++; return `${pre}text-${tier}`; });
    }
    if (bare && TYPOGRAPHIC.test(s)) {
      for (const [fill, tier] of TIER) {
        if (new RegExp(`bg-${fill}/\\d+(?![-\\w])`).test(s)) continue;  // pass 1 owns those
        const txt = new RegExp(`(^|[\\s:'"\`])text-${fill}(?![-\\w])`, 'g');
        s = s.replace(txt, (m, pre) => { hits++; return `${pre}text-${tier}`; });
      }
      // Same defect written in v4 arbitrary syntax. BSU alone has 95 of these
      // and they measured as low as 2.58:1 — `text-(--color-warning)` is the
      // raw fill by another spelling.
      for (const [v, tier] of ARBITRARY) {
        const esc = v.replace(/[-]/g, '\\-');
        if (new RegExp(`bg-\\(${esc}\\)/\\d+`).test(s)) continue;
        const txt = new RegExp(`(^|[\\s:'"\`])text-\\(${esc}\\)`, 'g');
        s = s.replace(txt, (m, pre) => { hits++; return `${pre}text-${tier}`; });
      }
    }
    for (const [v, tier] of ARBITRARY) {
      const esc = v.replace(/[-]/g, '\\-');
      if (!new RegExp(`bg-\\(${esc}\\)/\\d+`).test(s)) continue;
      const txt = new RegExp(`(^|[\\s:'"\`])text-\\(${esc}\\)`, 'g');
      s = s.replace(txt, (m, pre) => { hits++; return `${pre}text-${tier}`; });
    }
    return s;
  });
  if (!hits) continue;
  touched++; edits += hits;
  if (write) writeFileSync(f, out);
  else console.log(`${f}  (${hits})`);
}
console.log(`${write ? 'rewrote' : 'would rewrite'} ${edits} class token(s) in ${touched} file(s)`);
