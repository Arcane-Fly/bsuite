# Dark-mode AA failures on two shared theme tokens: --destructive text at 3.84:1 and the success badge at 2.62:1

https://github.com/GaryOcean428/bsuite/issues/2367

Snapshot updatedAt: 2026-08-31T02:49:28Z. Open at capture; re-read live.

Two `@bsuite/theme` tokens fail WCAG AA (4.5:1) **in dark mode**, on live pages. Found by the
promotion visual QA (bsuite#2361) and present in **production**, so this is not a regression —
it is backlog, but it is a real accessibility failure with exact numbers attached.

### The measurements

Taken through the **browser's own** colour pipeline (canvas → linear sRGB → WCAG), not a
reimplementation:

| | current | ratio | needed |
|---|---|---|---|
| `--destructive` as text on the dark ground `rgb(15 20 29)` | `oklch(0.580 0.230 25)` | **3.84:1** | L ≥ **0.620** → 4.53:1 |
| near-white badge text on the success teal | teal `oklch(0.600 0.130 195)` | **2.62:1** (probe) / 2.99:1 (synthetic near-white) | see below |

Live examples: `/awards` (`p.text-destructive`) and `/charge-rates` (the "Approved" badge,
`div.inline-flex.items-center.rounded-full`), both on `crm.crm7.app` and `d.crm.crm7.app`.

### Fix 1 — `--destructive` as text. Determined, no design choice.

The theme **already has the mechanism**: `--app-accent-text-l` / `--app-accent-text-d`, rebound
under `.dark` (`vars.css`). A colour that must differ as *text* between themes is exactly what
that pattern is for. So:

```css
--role-destructive-text-l: oklch(0.580 0.230 25);  /* light is fine as-is */
--role-destructive-text-d: oklch(0.620 0.230 25);  /* 4.53:1 on the dark ground */
:root { --destructive-text: var(--role-destructive-text-l); }
.dark { --destructive-text: var(--role-destructive-text-d); }
```

**Do not raise `--neon-electric-red` itself.** It is also a *surface* colour, and the palette is
whitelist-gated with tenant overrides deliberately blocked on `--role-destructive`. Only the
text binding needs to move.

### Fix 2 — the success badge. This one IS a design choice, which is why I did not pick.

Two valid options, both measured:

1. **Darken the teal surface** to `oklch(0.480 0.130 195)` → **4.81:1** with the existing
   near-white text. Keeps white-on-colour badges, changes the success hue's weight everywhere
   the role is used as a surface.
2. **Darken the text instead**, to about `oklch(0.100 0.02 195)` on the existing teal →
   **5.74:1**. Keeps the teal exactly as designed; makes success badges read as a light chip
   with dark text, which diverges from however the other badge variants are built.

(2) is the smaller blast radius; (1) is more consistent if every other badge is white-on-colour.
Whoever owns the design system should decide by looking at the other variants — I have not, so
I am not guessing.

### Shipping note

This no longer needs a promotion to reach a preview. Bump the version to a `-next.N`, merge to
`development`, and `publish-next.yml` puts it on the `next` dist-tag; pin an app to that exact
version and it appears on the `d.*` host. Runbook:
`docs/20260824-preview-canary-publishing-standard-v1.00A.md`.

### Related, from the same sweep

BSU is **broadly missing card elevation** — ~532 genuine `box-shadow: none` findings across 20
nav routes (after excluding 32 that were the probe matching form controls, since fixed), plus 52
`dark-mode card shadow carries no accent glow`. Also identical in production. Same owner,
probably the same sitting.

