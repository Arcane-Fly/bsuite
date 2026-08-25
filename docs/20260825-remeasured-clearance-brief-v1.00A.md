---
kind: record
authority: none
owner: bsuite
---

# The remeasured clearance brief — the ninety was not ninety

**Supersedes the operative counts in** `20260825-overnight-ninety-item-clearance-directive-v1.00A.md`.
That directive's method, landmarks, roles and bar all stand. **Its headline number does not.**

Measured 2026-08-25 evening against `origin/development` and production
`tuybltdrdefjblnplpqo`. Ledger: `bsuite_register_remeasure_20260825` +
`bsuite_register_remeasure_20260825_corrections`.

## THE NUMBER

| | |
|---|---:|
| items in the operator register (D-1 … D-109) | 109 |
| **probed properly this session** | **~45** |
| **measured ALREADY DELIVERED** | **~30** |
| genuinely open, precisely scoped | **~15** |
| of those, needing an operator decision rather than engineering | **4** |

**A ninety-item overnight fleet run was the wrong shape of work.** The register was not a backlog;
it was a backlog plus a large amount of finished work nobody had re-checked.

## HOW THE COUNT WAS WRONG — three distinct probe failures, all mine

Each looked like a finding and was an artefact. This matters more than the number, because the same
shapes will recur.

1. **A name-shaped probe cannot find a prop-shaped mechanism.** D-10 ("cannot create a company from
   `/leads/create`") was recorded ABSENT on a search for `QuickCreate*` components. It is fully
   built: `LeadForm.tsx:322` passes `onQuickAdd`, the label is dynamic
   (`Create company "<typed text>"`), and the affordance renders twice — a labelled button beside
   the field and an in-dropdown option — from `@bsuite/ui`, **two repos from the call site**, behind
   a 46-line dependency-injection shim.
2. **A guard one call away is invisible.** `effective_user_capabilities` scanned as unguarded on both
   `auth.uid()` and `raise exception`. The check is delegated to `caller_may_read_capabilities_of()`,
   a SECURITY INVOKER predicate. Nearly reported a live cross-tenant IDOR that was correctly fixed.
3. **A compound pattern requires the exact spelling you guessed.** D-22 (grace invites) read as
   "1 file" from `grace_?invite|graceSeat|per_?seat_?pric`. Per limb: grace 21 files, seat-count 17,
   Xero invoice 5, per-seat pricing 7, plus a DEPLOYED `update-seat-count` function.

Thirteen further measurement artefacts are listed in the ledger. **Nine of the fourteen would have
shipped as findings.**

## WHAT IS GENUINELY OPEN

### Needs an operator decision — engineering cannot rule these

| # | The decision |
|---|---|
| **D-40/D-99/D-103** permissions defaults | **NOT a missing feature — a DATA gap.** The editor loads existing rows and ships presets. **4 of 7 tenants have ZERO `role_capabilities` rows**, including `bsuite Platform`. And the defaults cannot be derived: across the three tenants that DO have rows, `platform_admin` disagrees on all 54 capabilities, `owner`/`member`/`gto_admin` on 38 of 54. **There is no estate convention to seed from.** |
| **D-90 / D-62** push a quote to crm7 | `r8-charge-rate-push` is DEPLOYED with secret-header auth and **R8 never calls it** — by design: *"RECEIVING side only… server-to-server — R8's own backend calls it, not R8's browser bundle."* **R8 has no backend.** The only live path is the manual `import-r8` paste, which IS D-62's *"forces the user to write code"*. Same gap, two register entries. |
| **D-58** MA000036 trade selector | MA000036 has a full module set but no `ma000036-occupations.ts`, and its allowances are not sector-keyed. What does "trade" mean for Joinery? |
| **crm7 `src/features/`** | 601 dead lines paralleling live code — `features/financial` (334, 0 importers) against the live `useFinancialStore`; `features/clients` (265, 0 importers). Delete, or finish the migration onto feature modules. Leaving both is the only invalid answer. |

### Engineering work, scoped

| # | Shape |
|---|---|
| **D-2 / D-109** email connect | The most-repeated item. D-109 gives it a reproducible failure: Google consent returns to the wrong app with the popup open → redirect_uri / authorised-origin mismatch. `email_integrations` still dual-writes plaintext `access_token`/`refresh_token`; **`smtp_password`/`imap_password` are ALREADY vault-only — do not "fix" those.** |
| **D-76** dates | **An adoption gap on a COMPLETE package, not a grep.** `@bsuite/dates` ships `formatDate`/`formatDateTime`/`formatTime` plus a `LocaleProvider` + `useLocale()`. Adoption: 2–3 files per app; **137 date call sites bypass it** and follow the browser locale. The user-facing preference is a near-inert setting honoured by ONE component. crm7 72+23 · BSU 14+8 · throughput 14+2 · braden 3+1. R80.4 imports the package **zero** times. |
| **D-70** every card draggable | **61% — 370/603 pages.** crm7 86% · throughput 52% · conduit 19% · BSU 15% · braden 8% · R80.4 0%. The gap is BSU and braden. |
| **D-18** screenshots in manuals | **Deeper than content.** The manual renderer supports `paragraph`, `list`, `note` — **there is no image block type at all.** Needs the block kind before any screenshot can exist. |
| **D-46** R8 Jodie | Logic only (`lib/jodie-*.ts`); **zero UI components**. |
| **D-105** margin | `ChargeRateCard.tsx:89–213` takes margin as a typed `$/hr` **input**, not profit computed from R8. The file carries a "Phase 1 deferral note". |
| **D-26** training-provider costs | Entity and CRUD exist; **zero** cost references. That limb alone is absent. |
| **D-30/D-74/D-101/D-106** reporting | **Unblocked by PI RULING 25.1** — a report is a read-only saved question over the semantic layer; the explorer is an editable grid; deep-link, never embed. |

## VERIFIED CLEAN THIS SESSION

- **types: 0 errors, all six apps**
- **security advisors: 0 ERROR** (143 WARN / 11 INFO), and the one new unallowlisted finding —
  anon holding EXECUTE on `is_platform_admin`, a caller-supplied-uid privilege oracle — is fixed,
  guarded against replay, and promoted
- **barrels: 251 estate-wide, 2 exporting nothing** (both the `features/` placeholders above)
- **estate: 7/7 repos on `development`, `main` tree == `development` tree, 14 remote branches**
- **migrations: 0 pending** in effect or ledger

## THE INSTRUCTION THAT REPLACES "CLEAR NINETY ITEMS"

**Re-measure before building.** Roughly two thirds of what the register calls open is already
delivered, several items citing the operator's own words in the code that implements them. A night
spent building what exists is worse than a night spent measuring, because it also produces a second
implementation to reconcile — which is precisely what `src/features/` already is.
