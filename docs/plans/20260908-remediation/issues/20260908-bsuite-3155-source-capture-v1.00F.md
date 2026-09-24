---
kind: record
authority: none
owner: bsuite
---

# [D-176] Typography is not customisable anywhere — the operator asks for font, size, weight, italics and heading level on every surface

https://github.com/GaryOcean428/bsuite/issues/3155

Snapshot updatedAt: 2026-09-07T10:26:37Z. Open at capture; re-read live.

## The operator's words (bsuite notes (8), 2026-09-06)

> "Must be able to fluidly customize all services and anything theme related. E.g. fonts, and
> size of font, italics, bold, heading level, or normal text. Every single surfact."

Registered as **D-176**.

## What it asks for

Per-surface **typography** control — family, size, weight, italic, heading level, body vs heading
— across **every service**, not only the colour tokens the branding page already exposes.

The emphasis is on the last three words. *"Every single surface"* is the ask, and it is what makes
this a platform capability rather than a settings page.

## Why this is not already covered

`/branding` on BSU exposes **colour** tokens — that is what its swatch grid is (`OKLCH`,
`Aa on white`, contrast demos). A search of crm7 issues for `font` / `typography` /
`customize theme` returns **nothing**, and the operator-notes register carries no row for
typography beyond **D-154**, which is a *defect* report ("`suite.crm7.app/login` Font wrong" — a
serif fallback on the login card), not a request for control.

So this is a **capability gap**, not a bug: there is nowhere to express the intent at all.

## Related, and deliberately distinguished

- **D-154** — the login card rendering in a serif fallback. A defect in the *current* type stack.
  Fixing it does not deliver this ask.
- **D-175 / crm7#2488** — pages not honouring assigned columns. Same customisation *surface*,
  different axis: layout, not type.
- **D-177 / crm7#2489** — the widget centre only offering entity widgets. Same theme of
  "customisation exists but is too shallow to use".

Read together, D-175/176/177 are one complaint from three directions: **the customisation
surfaces let you name a thing but not shape it.** Worth holding that framing when scoping, rather
than shipping three unrelated settings panels.

## What "done" would need

- Typography is a **token set** the same way colour is — family, scale, weight, style — so a
  change propagates rather than being re-typed per page.
- Reachable from the same place a person already goes to change branding; **no round trip** to a
  separate area to finish the task.
- Applies to **every** surface, including ones added later — a hard-coded per-page list is the
  failure mode this ask is written against.
- A preview that shows the change before it is saved, since type is judged by eye.

## Not yet assessed

Whether `@bsuite/theme` can carry typography tokens today, and what each app would need to
consume them. That scoping is the first task, not a conclusion — I have not read the package, and
saying otherwise would be inventing a mechanism.

Filed from the notes-intake cycle: `docs/intake/20260906-8d55ca88a709/` (403 paragraphs, 100
images; +4 new vs the 2026-09-03 capture).
