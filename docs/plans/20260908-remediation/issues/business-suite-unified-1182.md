# The 'Back to Dashboard' link on /branding is 1.06:1 — near-white text on a near-white page, and it is the only way back

https://github.com/GaryOcean428/business-suite-unified/issues/1182

Snapshot updatedAt: 2026-09-07T06:57:22Z. Open at capture; re-read live.

## The "Back to Dashboard" link on `/branding` is invisible in light mode

Live on **`suite.crm7.app/branding`**, production, signed in as `e2e@crm7.app`.

| property | value |
|---|---|
| element | `<a href="/">` — text **"Back to Dashboard"** |
| colour | `oklch(0.98 0.006 260)` → RGB **246, 249, 253** |
| composited background | RGB **242, 242, 242** (walked to `BODY.min-h-screen` — **no ancestor supplies a fill**) |
| **contrast** | **1.06 : 1** (AA needs 4.5:1) |
| font | 16px, weight 600 |
| box | 178 × 40, visible |

**Near-white text on a near-white ground.** This is not a faint-but-readable label — 1.06:1 is
essentially the page colour. The control occupies a real 178×40 box, so it is clickable; it is
just not *findable*.

It matters more than a typical contrast miss because of what it is: on a full-page editor, this
is **the primary way back**. A user who does not already know the link is there has no visible
route out except the browser's Back button.

## Why the background walk matters

The measurement composites up the ancestor chain and lands on `BODY`. That means **nothing
between the link and the body paints a background** — so this is not "a light label on a button
that failed to render its fill". The token itself is being used as text colour directly on the
page ground. A fix that only adds a button background would hide the defect rather than correct
the pairing.

## Method, and its controls

Colours resolved by painting each CSS value into a 1×1 canvas and reading back sRGB, because
`getComputedStyle` returns `oklch()`/`lab()` here and a naive parser **fails open** on those —
this estate has previously had a contrast gate return `Infinity` for every `oklch` colour and
therefore pass everything.

Controls carried on every run: black-on-white measured **21.0**, white-on-white **1.0**, and both
`oklch(...)` and `lab(...)` resolved to real RGB triples. The meter can produce a failing number,
so 1.06 is a measurement rather than an artefact.

## Scope — measured, with the page's own nature accounted for

`/branding` at 132 text elements examined: **19 below AA in light, 12 in dark**.

**Most of those are the page doing its job and are NOT defects.** `/branding` is a colour-token
editor: labels like `OKLCH`, `Aa on white`, `Elevated`, and `1.97 · Fail` are swatch captions and
contrast demonstrations — one of them is literally the page *reporting* a failing ratio as its
content. A contrast scan run over a colour picker will always light those up, and treating them
as defects would be classifying by appearance rather than behaviour.

**"Back to Dashboard" is the one that is not a swatch** — it is a navigation control. That is the
finding here; the rest of the 19 need a human pass to separate demo content from real misses, and
I am not filing them as defects on a count alone.

For contrast, `suite.crm7.app/settings` measured **0 below AA out of 25 examined, in both
themes** — see BSU#1165, where I have posted that the numbers recorded there no longer reproduce.

## An observation worth its own look

The onboarding wizard ("Get started with BSuite — Step 1 of 4") **re-opens on every route load**
for this tenant and sets `pointer-events: none` on `<body>`, so the whole page is inert until it
is dismissed. That is presumably intended for a first run, but re-presenting it on every
navigation is a different thing from showing it once. Not filed here — flagging it because it
also means **any automated pass that does not dismiss it is measuring the wizard, not the page**.
My own first `/settings` reading made exactly that mistake and has been discarded.
