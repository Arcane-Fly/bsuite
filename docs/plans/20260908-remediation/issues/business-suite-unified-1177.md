# two custom properties nothing declares: the marketing header renders with no background, and three gradient rules are dropped

https://github.com/GaryOcean428/business-suite-unified/issues/1177

Snapshot updatedAt: 2026-09-06T12:18:41Z. Open at capture; re-read live.

`var(--x)` with no fallback naming a property nothing declares is an **invalid
declaration**: the browser drops it, the element keeps whatever it inherited, and
nothing errors. It does not fail loudly — it just is not there.

business-suite-unified#1175 fixed one instance (`--text-muted-foreground`, which
meant the "muted" styling on locked service tiles had never once been applied)
and landed `src/__tests__/ink-token-contract.test.ts` as a ratchet. These are the
two the scan found and left.

## 1. `--bg-shell-chrome` — the marketing header has no background (LIVE)

`src/components/marketing/MarketingHome.tsx` sets the public marketing home's
sticky header to `background: var(--bg-shell-chrome)`, no fallback. The property
is declared nowhere — not in this app, not in `@bsuite/theme`,
`@bsuite/nav-core/tokens` or `@bsuite/ui/dist`.

Measured at runtime on `suite.crm7.app` `9292b84`:

```
getComputedStyle(document.documentElement).getPropertyValue('--bg-shell-chrome')  ->  ''
getComputedStyle(document.querySelector('[role=banner]')).backgroundColor         ->  rgba(0, 0, 0, 0)
```

So the sticky header is transparent and content scrolls under it behind only a
`backdrop-blur-md`. This is the **one named entry** in `ink-token-contract.test.ts`'s
`KNOWN_UNDECLARED`; fixing it means deleting that entry, and the test fails if
the entry is left behind after the fix.

throughput uses the same token name in its own `Navigation.tsx`, so worth
checking which app (if either) is meant to declare it before picking a value.

## 2. `--accent-hover` — three dead rules, one of which would render invisible text

`src/index.css` references `var(--accent-hover)` with no fallback in three rules:

- `.hero-title-accent` (line ~1264)
- `.btn-hero-primary` (line ~1282)
- `.btn-primary` (line ~1625)

all of the form `background: linear-gradient(135deg, var(--accent-primary), var(--accent-hover))`.
`--accent-hover` is undeclared (`getPropertyValue` -> `''` on the live build), so
the whole `background` declaration is invalid and is dropped.

**No user-visible effect today**: `grep` for these three class names across
`src/**/*.tsx` finds **zero** consumers. They are dead rules.

It is still worth fixing rather than only deleting, because `.hero-title-accent`
also sets `-webkit-text-fill-color: transparent`. The day anything uses that
class, the gradient will not paint and the heading will render as invisible text
— visual-gate class V-C2/V-C1, and exactly the failure mode that is hardest to
notice in review.

## Method

Every `var(--x)` without a fallback under `src/components` and `src/pages`,
checked against the union of declarations in this app's CSS, `@bsuite/theme/src`,
`@bsuite/nav-core/tokens`, `@bsuite/ui/dist`, plus this app's own runtime
`setProperty`/`setOrClear` calls and CSS-in-JS template declarations. Comments
stripped first, so a comment describing a defect is not counted as one. Before
#1175 the list was 2 entries; after it, 1.

