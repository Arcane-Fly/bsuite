---
kind: record
authority: none
owner: bsuite
---

# BSU status border tokens measure 1.13-1.92 against a 3:1 floor, and the JodieAI mode chips carry state in colour alone

https://github.com/GaryOcean428/bsuite/issues/2621

Snapshot updatedAt: 2026-08-31T02:49:46Z. Open at capture; re-read live.

## The numbers

`business-suite-unified/src/index.css` defines the status triples **locally** (not in `@bsuite/theme`):

    --color-<role>-bg:     color-mix(in oklch, var(--role-<role>) 10%, transparent)
    --color-<role>-border: color-mix(in oklch, var(--role-<role>) 30%, transparent)

Border (role at 30%) measured against the wash it sits on and against the panel:

| role | light vs wash | light vs panel | dark vs wash | dark vs panel |
|---|---|---|---|---|
| success | 1.27 | 1.42 | 1.36 | 1.52 |
| warning | 1.13 | 1.20 | 1.62 | 1.92 |
| error | 1.42 | 1.67 | 1.21 | 1.26 |
| info | 1.15 | 1.24 | 1.61 | 1.90 |
| primary | 1.33 | 1.53 | 1.25 | 1.35 |

**All twenty cells below 3:1.** For scale, the border defect you reported as an
"unstyled button" (bsuite#1958) measured 1.12:1 — these are in the same band.
50 sites use these tokens.

## Where it is decorative, and where it is not

On a status callout that already carries a tinted background AND coloured text, the
border reinforces what two other signals convey. WCAG 1.4.11 binds *graphical objects
**required** to understand the content*, so that use is arguably out of scope.

**But `components/ideas/JodieAI.tsx` is not that.** Its mode selector is a row of
buttons where the colour set carries the SELECTED state — selected gets
`MODE_META[m].color`, unselected gets `border-border/50 text-muted-foreground`.

Measured in light mode:

    border selected vs unselected   1.13    (need 3.0 to distinguish state)
    background selected vs unsel    1.06
    selected label on its own bg    1.70    (need 4.5)

All three state signals are ~1.1, and the selected label itself is **1.70:1** — not a
state-perception nicety, an unreadable control label.

The label cause is `text-(--color-warning)`, a FILL token used as text, now ratcheted
estate-wide as G13 (bsuite#2617, 176 sites). Fixing that one line lifts the label; it
does **not** fix the 1.13 state distinction.

## The decision

Whether `--color-<role>-border` is allowed to be decorative.

- **If yes** — record it and the twenty cells stop being a finding. JodieAI still needs
  its state conveyed by something other than a 1.13 border: a filled background, a
  checkmark, or `aria-pressed` plus a visible weight change.
- **If no** — raise the 30% mix until the border clears 3:1 on its own wash. Measurable
  in minutes with `packages/theme/src/contrast-instrument.ts`; the figures above are the
  baseline to beat.

Not changed unattended because it moves every status surface in BSU, and these are
brand-adjacent values.
