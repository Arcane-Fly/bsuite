---
kind: record
authority: none
owner: bsuite
---

# Reference-register carry-overs: 199 quarantined traineeships, 7 unloaded states, sta_product_code, no training-contract edit page

https://github.com/GaryOcean428/crm7/issues/1444

Snapshot updatedAt: 2026-08-06T11:18:25Z. Open at capture; re-read live.

Carry-overs from the ANZSCO / WA title register work (crm7 #1443, applied and verified in the catalog). Filed so they stop living in a session summary.

**Shipped and live:** 1,023 ANZSCO occupations, 369 WA titles, 360 with nominal terms (58 ranged), 8 per-state source rows.

## 1. 199 quarantined traineeship rows

Of 471 parsed from `jswa-eligible-traineeship-list-2026-version3.pdf`, 274 loaded and **199 were deliberately not loaded**. They failed an explicit gate: title >60 chars, two `(Level` markers, title starting with "Certificate", or a course not starting with a qualification word.

They're PDF three-column merge artefacts — a title wraps *across* the code line, so text for one row appears above and below it, and column offsets shift between pages. A merged row like `"Broadcasting (Radio) (Level 4) Broadcasting (Remote Area"` looks like a real title and would sit in a picker indistinguishable from one.

**Route:** the bulk-import path with a human reviewing, not a looser gate.

## 2. Seven states unloaded

Only WA has a supplied source. `apprenticeship_title_sources` records all eight with `loaded_at NULL` for the other seven, and `apprenticeship_title_coverage` exposes `is_loaded` so an empty picker says *why*.

Priority is not uniform — the notes on each row say so:
- **SA and TAS** use WA's shorter-of-3-months-or-one-twelfth rule, so loading them **sharpens probation from a range to a date**. Highest value.
- **QLD** legislates probation in days and never consults nominal term — works with no register at all.
- **NSW** ties it to the VTO, **VIC** to the qualification; neither is derivable from a title register.

## 3. `sta_product_code` empty by design

WA DTWD's own code (the `AP01960` form) is in none of the four published sources — it's only reachable through a search UI that must be driven by hand. NULL means "not yet retrieved", deliberately distinct from "none".

`sta_code` currently holds a deterministic slug of the title, which *is* the register's natural key. It is **not** the qualification code: that's a national identifier and it collides (`AUR32721` backs both Electric Vehicle Heavy and Light).

## 4. No training-contract edit page

All four new fields (occupation, qualification, apprenticeship title, STA state) are wired on the **create** flow only — `src/pages/contracts/training/create.tsx`. There is no `[id]/edit.tsx`; the detail page is view/transitions-only. An existing contract cannot have these corrected in the UI.

Probably the highest-value item here: the registers are useless for a contract created before they existed.

## 5. Qualification one-shot is auto-fill, not `suggestedIds`

`QualificationSelector` is a bespoke TGA-import combobox, not built on `EntitySelector`, so it has no `suggestedIds`. It already auto-fills from the selected apprentice — arguably stronger than a suggestion — but it's inconsistent with the other two pickers.
