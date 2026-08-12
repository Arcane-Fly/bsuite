# Refined execution prompt — R80.4 award engine to zero, and the crm7 transfer

**Tier:** Heavy · **Written:** 2026-08-11 · **Operator gate:** *"nothing can be moved on until all
awards calculate perfectly."*

## Intent

Close the remaining award-engine defects so every modelled award prices correctly, then finish the
crm7 rate-card transfer that replaces a JSON paste box — with each stage gated by red-teaming, a
wiring check, a definition-of-done, and persona reviews that include a **developer advocate** (can a
developer visually build a feature, connect existing entities, and create entities through the UI —
not just read them).

## Decomposition

| # | Workstream | Depends on | Repo |
|---|---|---|---|
| W1 | **47 rate-scope partials** across 17 awards — the operator gate | — | R80.4 |
| W2 | **Per-award penalty tables** for 18 awards (live MAPD import) | — | R80.4 |
| W3 | **MA000025 casual cohorts** — `mapd-penalties.ts` exists, is NOT wired into `calculate()` | W2 | R80.4 |
| W4 | **MA000010 cl.11.1(e)** 17.5% casual carve-out, vehicle-manufacturing technical staff | — | R80.4 |
| W5 | **Rate-card transfer** — delete the paste box; "Send to crm7" (spec written, session bridge merged so it is unblocked) | — | R80.4 + crm7 |
| W6 | **Persona review** — end user, tenant admin, developer advocate | W1–W5 | all |
| W7 | **crm7 tail** — merge #1561 + catalog-guards PR, AVETMISS behind a flag | — | crm7 |

## Best-practice citations

Sourced from the codebase and this session's own measurements rather than re-researched — the stack
is fixed and already documented in-repo.

- **`biz-au-award-modelling`** — the reconciliation harness *"that proves the SHIPPED path — not a
  test-local re-derivation — reproduces the published dollars."* This is W1's method, not a nice-to-have.
  Source-of-truth ranking it sets: **MAPD API > pay guide > bundled table.**
- **`awards/docx-text/<CODE>.txt`** is the clause-text authority. `awards/*.md` **destroys sub-clause
  lettering** (renders `(a)/(b)/(c)` as `1. 2. 3.`). Proven today: 8 wrong citations, 3 pointing at an
  entirely different clause.
- **FWC MAPD API** hazards, all measured: paging truncates to page 1 silently; a 200 with no `_meta`
  is an error not end-of-results; superseded rows sit beside current ones; units are mixed within one
  award; **a classification NAME is not a unique key** — use `classification_fixed_id`.
- **`general-dry-one-shot-architecture`** — one owning app per entity; others READ. No mirror tables,
  no free-text where an entity exists.
- **`bsuite-page-grid-layout`** — ONE `CanvasCard` per logical card; bump the layout-version key or a
  returning user never sees the change.

## Blindspots to counter — drawn from THIS session's real failures, not a generic list

1. **A ledger status is a lever.** Six false-completes found today, including MA000020, the flagship.
   *Counter:* a partial closes only with code + a test that fails without it. Editing coverage JSON is
   never the deliverable.
2. **Local green ≠ CI green.** `pnpm run audit` and `pnpm run verify` are **different scripts**;
   reachability runs only in `audit`. A lane passed `verify` locally and failed CI.
   *Counter:* run BOTH before claiming done.
3. **A fresh worktree has no `node_modules`.** `pnpm run build` then exits 0 with no `dist/` — a
   silent false-green. *Counter:* `corepack pnpm install` is the second command, always.
4. **Unpushed work dies.** A lane ran 40 minutes, stalled, worktree reclaimed, everything lost.
   *Counter:* push the branch at the first meaningful commit, then after every commit.
5. **Counting without partitioning.** I reported "6 rows, 3 distinct — duplicates"; partitioned by
   tenant every row was unique. *Counter:* state the GROUP BY in the claim itself.
6. **A gate never seen failing is not a gate.** *Counter:* break it deliberately, watch it go red,
   revert — and say so.
7. **Reporting motion as progress.** The competency module moved the partial count by zero because it
   is `payrun` scope. *Counter:* re-measure the SAME number before and after; if it did not move, say
   so plainly.
8. **Browser MCPs are DISCONNECTED this session** (playwright, chrome-devtools).
   *Counter:* a lane needing visual proof installs its own driver locally. Do not claim a visual check
   that was not run.
9. **Editing a lane's branch while it runs.** I did this today and duplicated its fix.
   *Counter:* message the lane, or wait for its notification.
10. **The engine deciding instead of pricing.** *"R8 PRICES, IT DOES NOT DECIDE"* — its own words. 72
    violations found. *Counter:* eligibility, classification and progression are INPUTS. But note the
    inverse trap: where the award states a guaranteed floor ("whichever is the earlier"), removing the
    calculation creates an **underpayment path**. Price the floor; ask for the rest.

## Skills & MCPs to use

| Use | When |
|---|---|
| `biz-au-award-modelling` | W1, W2 — the reconciliation harness and source-of-truth ranking |
| `biz-au-award-boot` | W1 — award-interpretation semantics |
| `bsuite-reliability-red-team` | after W1–W3 — money paths, multi-tenant |
| `bsuite-rls-authz-red-team` | W5, W7 — anything touching RLS or grants |
| `general-dry-one-shot-architecture` | W5, W6 — entity ownership |
| `bsuite-page-grid-layout` | W5, W6 — card system, layout-version bump |
| `bsuite-brand-system` | W5, W6 — tokens only; pure white/black banned in every role |
| `bsuite-react-testing` | W1–W5 — Vitest/RHF/Zod patterns |
| `bsuite-developer-portal` | W6 — the developer-advocate surface |
| `agent-definition-of-done` | every stage close — D1–D7, APPROVE or SEND_BACK |
| `general-what-done-looks-like` | W6 — the excellence bar, not the ticket minimum |
| `bsuite-ship-visual-promote` | final — feat→dev→visual→main |
| **supabase MCP** | live schema/RLS/grant verification (SELECT only from lanes; never `apply_migration`) |
| **vercel MCP** | deployment state, production branch |
| **qig-memory MCP** | inbox coordination + `bsuite_` durable memory |
| **tavily / sourcegraph** | external award/API research when in-repo sources are silent |

## The refined prompt

> Drive R80.4 to **zero rate-scope partials** across all 21 modelled awards, then finish the crm7
> rate-card transfer. Work in stages; each stage ends with a red-team, a wiring check, a DoD verdict,
> and — for anything a human touches — a persona review.
>
> **Stage 1 (the gate).** Close W1's 47 partials. Use the reconciliation harness: for every "Summary
> of Hourly Rates" / "Summary of Monetary Allowances" schedule, prove the engine's derived figure
> reproduces the award's published table **to the cent, through the shipped path**. Where a schedule
> governs a decision rather than a rate, correct its SCOPE with evidence — do not model it — but never
> use that as cover to skip real pricing work. Re-measure the partial count before and after and
> report both.
>
> **Stage 2.** Ingest per-award penalty tables from the live MAPD API (W2), wire the MA000025 casual
> path that already exists but is unreachable (W3), and model the MA000010 17.5% carve-out (W4).
>
> **Stage 3.** Delete the JSON paste box and ship "Send to crm7" per the written spec (W5).
>
> **Stage 4 — personas.** Review as: (a) a GTO manager pricing a placement; (b) a tenant admin
> configuring their organisation; (c) a **developer advocate** — can a developer visually build a new
> feature, connect it to existing entities, and create new entities through the UI, or does every path
> require SQL? Name every place the answer is no.
>
> **Rules that bind every stage:** award text from `awards/docx-text/`, never the markdown. A ledger
> status is never the deliverable. Refuse rather than return a wrong number. Push early. Run BOTH
> `audit` and `verify`. Prove any new gate fails. Nothing promotes to `main`.

## Definition of done

Zero rate-scope partials across 21 awards · `pnpm run audit` **and** `pnpm run verify` green · every
new gate demonstrated failing · D1–D7 APPROVE recorded per stage · persona review written with named
gaps · nothing promoted without the operator's visual sign-off.
