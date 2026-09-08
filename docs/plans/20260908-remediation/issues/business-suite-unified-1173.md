# [P0][theme] Kill ring-offset #fff + declare glow-accent for /gto elevation

https://github.com/GaryOcean428/business-suite-unified/issues/1173

Snapshot updatedAt: 2026-09-06T09:46:51Z. Open at capture; re-read live.

## P0 — Maker lane (BSuite Maker) 2026-09-06 PT

### Problem
- suite CSS still has `--tw-ring-offset-color:#fff` after color-white scrub
- Prior SEND_BACK: `--glow-accent` / `--glow-accent-hover` consumed but undeclared → `/gto` V-C7 elevation FAIL (history: BSU#1166/#1169)

### DoD
1. PR → `development`
2. No `--tw-ring-offset-color:#fff`; no `--color-white:#fff`
3. Glow tokens declared where consumed; consumed-but-undeclared gain 0
4. `/gto` elevation cells 0/8 FAIL
5. Evidence on PR; CI green

### Constraints
Neon Electric SaaS only; WCAG AA+; no Corporate red/gold on SaaS.

Owner: coding makers. Visual DoD: BSuite Maker + Ship.
