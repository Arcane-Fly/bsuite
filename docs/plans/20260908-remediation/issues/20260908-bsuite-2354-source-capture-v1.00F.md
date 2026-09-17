---
kind: record
authority: none
owner: bsuite
---

# mobile/: 40 off-palette colour literals, including pure black, against the D2C source of truth

https://github.com/GaryOcean428/bsuite/issues/2354

Snapshot updatedAt: 2026-08-24T10:30:11Z. Open at capture; re-read live.

Surfaced by widening `audit-palette-whitelist` to `mobile/` (#2353). That guard walked `packages/` only and printed the **allowlist size** as its pass line, so its output was byte-identical whether it scanned 583 files or zero. `mobile/` had never been looked at.

## The findings — 40 literals across 4 files

```
[palette-whitelist] 425 file(s) examined across packages, mobile; 40 off-palette colour literal(s).
  mobile/components/ui/Button.tsx   #f2f2f2
  mobile/components/ui/Toast.tsx    oklch(0.0 0.0 0.0)     <- PURE BLACK, banned outright
  mobile/lib/constants.ts           15 raw oklch literals under a "D2C Neon Electric" header
  ...
```

Two are more than style drift:

| | |
|---|---|
| `mobile/components/ui/Toast.tsx` | `oklch(0.0 0.0 0.0)` — **pure black is banned in every role**, no exceptions |
| `mobile/lib/constants.ts:19` | `warning: 'oklch(0.868 0.125 81.4)'` against the declared `--role-warning` of `oklch(0.728 0.168 22.5)` — a **different colour** shipping under the same role name |

The file carries a "D2C Neon Electric" header, so it is claiming conformance it does not have.

## Why they are banked rather than fixed

They are ratcheted in `scripts/palette-whitelist-baseline.json` — may only shrink, enforced in both directions. **They are not fixed.** Re-deciding a React Native colour system is a design change with visual consequences I cannot verify: there is no `d.*` preview for a mobile app, so the visual gate does not reach it. Fixing 40 literals blind and calling it done would be the exact pattern this estate keeps complaining about.

## What is needed

1. Decide whether `mobile/` adopts the D2C tokens properly (importing from `@bsuite/theme`) or keeps a deliberately separate native palette — if separate, it should stop claiming the D2C header.
2. The pure black is not a decision, it is a violation, and can be fixed independently of (1).
3. Whoever fixes any of them must **lower the ceiling** in the baseline in the same change — a reduction that is not banked fails the gate on purpose, so the number cannot drift back up.

Blocked on a design call, not on effort.
