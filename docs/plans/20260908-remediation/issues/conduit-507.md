# focus-visible:ring-2 renders no visible ring in dark mode (portal/careers job card, likely others)

https://github.com/GaryOcean428/conduit/issues/507

Snapshot updatedAt: 2026-08-31T02:52:40Z. Open at capture; re-read live.

## What's broken

`focus-visible:ring-2 focus-visible:ring-ring` combined with `focus-visible:outline-none` produces **no visible focus indicator at all** in dark mode on at least one element: the job-card `<Link>` in `src/app/portal/careers/page.tsx` (line ~166).

This is a WCAG 2.4.7 (Focus Visible) violation on a real, unauthenticated public page.

## How it was found

Discovered incidentally while measuring the elevation-gate fix in #506 (Playwright, keyboard-Tab focus, dark mode). Confirmed **unrelated to that PR** by testing three separate variants of the same element, isolating one file at a time via `git stash` / direct `git show development:<file>` restores:

1. Current PR's fix (`shadow-elev-2` + a `.dark .shadow-elev-2 { --tw-inset-shadow: var(--glow-card) }` rule) — ring slot renders zero.
2. An earlier draft of the same PR (`shadow-[var(--shadow-card)]` arbitrary value) — ring slot renders zero, identically.
3. **The true, completely unmodified `development` branch** (`shadow-sm`, nothing touched) — ring slot **still renders zero**.

All three reproduce the exact same symptom, which rules out anything in #506 as the cause.

## Repro

```js
// Playwright, dark mode, keyboard-focus the portal/careers job card link
const el = document.activeElement; // after Tab-ing to the job card <a>
el.matches(':focus-visible'); // true
getComputedStyle(el).getPropertyValue('--tw-ring-shadow');
// -> "0 0 0 calc(2px + 0px) lab(44.776% 21.0265 -75.5296)"  (a REAL, valid ring value)
getComputedStyle(el).boxShadow;
// -> "..., oklab(0 0 0 / 0) 0px 0px 0px 0px, ..."  (the ring's SLOT in the
//     composited box-shadow is transparent/zero-size, even though the
//     custom property that feeds it is valid)
```

The `--tw-ring-shadow` custom property itself computes correctly. The mismatch is in how the final composited `box-shadow` shorthand (`var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)`) resolves that same variable for this specific element — worth checking whether `.shadow-sm`/`.shadow-elev-2`/`.shadow-[...]` (any rule that ALSO fully re-declares the `box-shadow` shorthand) is winning the cascade over `.focus-visible\:ring-2:focus-visible`'s own `box-shadow` declaration in a way that snapshots a stale/pre-focus value for `--tw-ring-shadow`, or a Tailwind v4 / Chromium interaction with `calc()` inside a `var()` chain at that position.

## Scope

Only confirmed on the one job-card link on `/portal/careers`. Given `focus-visible:ring-2` is a common pattern across the app (grep shows it on multiple cards/buttons), this may be wider — worth a full keyboard-nav sweep in dark mode once triaged.

## Not fixed here

Out of scope for #506 (card-elevation visual gate), which does not touch `--tw-ring-shadow` or any ring/focus utility. Filed per BSuite CLAUDE.md §1 (no silent deferral of discovered defects) as its own issue rather than expanding #506's scope.
