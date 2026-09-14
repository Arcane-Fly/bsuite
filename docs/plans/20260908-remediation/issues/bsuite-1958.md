# Interactive borders fail WCAG non-text contrast — the operator's 'unstyled button' is 1.12:1 and I reported it fixed

https://github.com/GaryOcean428/bsuite/issues/1958

Snapshot updatedAt: 2026-08-24T03:27:23Z. Open at capture; re-read live.

The outline button on the live conduit application-success page is technically an outline variant and visually is not one. Measured against the **deployed** stylesheet, not source.

| | light | dark | WCAG 1.4.11 floor |
|---|---|---|---|
| button border vs card surface | **1.12:1** | 2.26:1 | 3:1 |
| button fill vs card surface | 1.06:1 | 1.04:1 | — |

This is the operator's own report — *"one button unstyled"* — and my earlier fix (conduit#440) only half-addressed it. Moving the button onto an elevated `bg-card` surface made it *nominally* an outline variant without making the outline **visible**. I described that as fixed. It is not.

## Why no existing token solves it

Both border roles resolve to separator colours, chosen to divide content quietly:

| token | light value | vs panel |
|---|---|---|
| `--role-border` (= `--input`, = `--border`) | `#e9ecef` | 1.12:1 |
| `--role-border-strong` | `#d4d8dd` | 1.36:1 |

Neither is close to 3:1. Reaching it in light mode needs roughly `oklch(0.63)` — a mid-grey — because the D2C light surfaces are all clustered between L 0.96 and L 0.98, so **any** border that contrasts with them is substantially darker than today's.

bsuite#1957 fixes the dark-mode half, where `--role-border-strong` was simply missing. It deliberately does not touch this, because this is not a missing value — it is a **design decision with a visible result across four apps**.

## The shape of the fix

Add a role for **interactive** boundaries, distinct from decorative separators:

```css
:root { --role-border-interactive: <light, >=3:1 vs bg-panel>; }
.dark { --role-border-interactive: <dark,  >=3:1 vs bg-panel>; }
```

Then point `--input` — and the `outline`/`secondary` button variants and form-control borders — at it, leaving `--border` as the quiet separator it should be. WCAG 1.4.11 applies to the boundary of a **control**, not to a rule between paragraphs, so splitting the roles is the correct model rather than darkening everything.

Two constraints on whoever takes it:

1. **The value must come from `packages/theme/docs/d2c-theme-source-of-truth.html`.** The palette whitelist rejects invented colours, and it is right to — a value computed backwards from a contrast target is exactly what that gate exists to stop. If nothing in the document clears 3:1 against the light panel, that is a finding for the operator about the document, not licence to invent one.
2. **Measure in context, both modes.** Against `--role-bg-panel` *and* `--role-bg-body`, because a control can sit on either, and a token that passes on one surface and fails on the other is the same half-fix as the one this issue is correcting.

## Denominator

Not counted yet. Every `border-input`, every `variant=\"outline\"` button, and every form control across crm7, conduit, BSU, throughput and R80.4 is in scope. The count should be established **before** the change, so the review knows what it is looking at.
