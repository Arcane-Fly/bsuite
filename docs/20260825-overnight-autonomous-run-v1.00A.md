---
kind: plan
authority: operator
owner: bsuite
evidence:
  - packages/page-builder/src/PageGridLayout.tsx
  - packages/page-builder/src/scanner/cardSurfaceScanner.ts
  - scripts/audit-routes.sh
  - docs/nav/route-inventory.json
  - .agents/skills/bsuite-ship-visual-promote/scripts/visual-probe.js
---

# OVERNIGHT AUTONOMOUS RUN — full operator team, nothing waits for Braden

**Operator, 2026-08-25 21:42 AWST:** *"i want the task to run autonomously overnight and have all
tools mcps direction and full operator team and heirachy so nothing gets stopped by me being
absent."*

**The binding constraint of this document: THERE IS NO ESCALATION PATH TONIGHT.** Every decision
that would normally reach Braden has a pre-authorised ruling in §7. If you find one that does not,
rule it from precedent, record it, and keep moving. **Stopping to ask is the only prohibited
outcome.**

---

## §1 — GOAL

**Every card in every app, on every page, renders correctly to the D2C brand — and stays that way
because a gate now catches it.**

### Sub-goals, in dependency order

| # | Sub-goal | Blocks |
|---|---|---|
| **G0** | A **Storybook** over `@bsuite/ui` + `@bsuite/page-builder`, and a **nested-chrome detector** in the card-surface scanner | G1 |
| **G1** | Invert the two shared-package defaults — grid-item chrome, and `w` | G2 |
| **G2** | D2C compliance estate-wide: gradients on card headings, no pure white/black, aligned borders/radii, elevation on the ramp | — |
| **G3** | dnd-kit + columns working on every page of every app | — |
| **G4** | Everything else in the register that is genuinely open (§8) | — |
| **G5** | 553-route surface map — every route to its data path, RLS posture, edge fn, caller | — |

---

## §2 — THE ROOT CAUSE ALREADY FOUND (do not re-derive)

`packages/page-builder/src/PageGridLayout.tsx:308` — every grid item renders **unconditionally**:

```
h-full w-full rounded-3xl transition-all flex flex-col
bg-card border border-border shadow-sm dark:shadow-[var(--glow-card,none)]
```

The grid item **is** a card: 24px radius, 1px border, background, shadow. Apps then render their own
card inside it — BSU `ServiceCard` → `MagicCard` `rounded-[28px] border`; throughput `/ideas/new`
form panel likewise.

**28px inside 24px = misshapen corner. Two 1px borders = the fat bottom edge.**

**Measured, and it settles which side is wrong:**

| | files nesting an inner card | files using CanvasCard | |
|---|---:|---:|---|
| crm7 | 304 | 331 | 92% |
| business-suite-unified | 7 | 8 | 88% |
| conduit | 1 | 1 | 100% |
| braden | 2 | 3 | 67% |
| throughput | 2 | 9 | 22% |
| **estate** | **316** | **352** | **90%** |

**Nesting is the norm. The grid item is the wrong side.**

Second defect, same file: `CanvasCard.w` **defaults to 12** on a 12-column grid.

| | omit `w` | total | |
|---|---:|---:|---|
| crm7 | 973 | 1620 | 60% |
| business-suite-unified | 53 | 53 | **100%** |
| conduit | 1 | 1 | **100%** |
| braden | 11 | 16 | 68% |
| throughput | 30 | 39 | 76% |
| **estate** | **1068** | **1729** | **61%** |

**1,068 cards render full width because of a default.** That is the columns complaint.

---

## §3 — STAGE 0: STORYBOOK FIRST. NON-NEGOTIABLE.

**Operator: *"this is why we need a components library like storybook."* He is right, and it is the
reason G1 is safe to ship at all.**

`@bsuite/page-builder` 1.0.4, 1.0.5 and 1.0.6 each shipped **GREEN AND BROKEN** this week. Every
test drove the hook with **no grid attached**; only a deployed visual check caught them. Types,
lint, unit tests and CI are all green estate-wide **right now** and cannot see a 28px card in a
24px frame.

**Build before touching G1:**

1. **Storybook** (or Ladle if it installs faster — justify the choice in the PR) at
   `packages/ui/.storybook`, covering **both** `@bsuite/ui` and `@bsuite/page-builder`.
2. Stories that make each defect class **visible and diffable**:
   - a `CanvasCard` containing a bare child → **one** border, one radius
   - a `CanvasCard` containing a `Card`/`MagicCard` → **still one** border (the regression story)
   - the same at `w` = 2 / 3 / 4 / 6 / 12
   - a card heading with and without `gradient-text`
   - light + dark, at 1440 / 1024 / 768 / 390
3. **A nested-chrome detector** added to `packages/page-builder/src/scanner/cardSurfaceScanner.ts` —
   it already exists and already catches *glued* cards (V-C4); it does **not** catch nested chrome
   (V-C5). Extend it. **It must fail closed** and self-test, per that file's own doctrine: *"a gate
   that cannot tell 'checked nothing' from 'found nothing' is not a gate."*
4. Wire the detector into CI for all six apps.

**DoD for G0:** the detector, run against `origin/development` today, **reports the 316 nested
files**. A detector that reports zero on a known-broken estate is broken itself — prove it fails
before trusting it to pass.

---

## §4 — SILOS. These run CONCURRENTLY.

Operator: *"silo the work, so the theme work can be done concurrently but all other fixes get
shipped as they arrive."*

### SILO A — THEME (long-running, gated, one lane, ships once)

Owns `packages/theme`, `packages/ui`, `packages/page-builder`, and every app's card/heading surface.
**Does NOT ship incrementally** — a half-applied grid inversion is worse than none. One coordinated
release: package version bump → all six consumers → one promotion.

Order inside the silo: **G0 → G1 → G2 → G3.**

### SILO B — CONTINUOUS SHIP (many lanes, ship on green)

Everything else. **Each fix ships the moment it is green** — its own PR, its own promotion, its own
gitlink advance. Do not batch. Do not wait for Silo A.

Lanes: security · register items (§8) · route surface map (G5) · docs.

**Rule between silos:** Silo B never edits `packages/theme|ui|page-builder`. If a Silo B fix needs
one, it files the need to Silo A via the inbox and picks up the next item. **No cross-silo edits to
the same file — that is the one-shot rule applied to the night itself.**

---

## §5 — TEAM AND HIERARCHY

| role | count | tier | mandate |
|---|---:|---|---|
| **Operator-Agent** | 1 | frontier | Acts with Braden's authority. Rules from §7 and from the precedent book. Records every ruling the same turn via `agent-mem-precedent-clerk`. **Never implements. Never escalates — there is nobody to escalate to.** |
| **Silo A PI** | 1 | high | Theme. Owns the packages and the coordinated release. |
| **Silo B PI** | 1 | high | Continuous ship. Assigns lanes, enforces one-open-PR-per-lane. |
| **Lane leads** | 1 per repo (7) | standard | crm7 · business-suite-unified · conduit · braden · throughput · R80.4 · parent. Own their branch, PR, gates, merge, cleanup. |
| **Workers** | as needed | standard (mechanical → low) | One scoped task, isolated worktree, never merge, never mark done. |
| **Verifiers** | ≥1 per item | high | **A lane other than the claimant.** The only role that may write `VERIFIED-DONE`. |

Cap ~2 concurrent frontier. Always pass an explicit model on dispatch. Worktrees **only** under
`~/Desktop/Dev/worktrees/`.

**Liveness:** a lane whose transcript stops growing is DEAD — revive it. Sessions die on API 529
overloads, not on decisions. The Operator-Agent polls every lane; a silent lane is re-dispatched
with its last state, not waited on.

---

## §6 — MCPs AND SKILLS

### MCPs — what each is the authority for

| MCP | authority |
|---|---|
| **supabase** | `list_tables`, `execute_sql`, `get_advisors`, `list_migrations`, `list_edge_functions`. **Never infer a column, grant, policy or row count — query it.** Rehearse DDL in a transaction and ROLLBACK before committing the migration. |
| **playwright** / **chrome-devtools** | The visual gate. `browser_evaluate` runs `visual-probe.js`. **Unregister the service worker first** — crm7 is a PWA and will serve you the previous build. Seed session state with `addInitScript` BEFORE navigating, never after. |
| **context7** | Gate A. Exact installed version of any library before the first edit touching it. |
| **vercel** | Deployment state, build logs, runtime errors. Confirm the live SHA equals the pushed SHA before inspecting anything. |
| **github** | PRs, checks, reviews, workflow dispatch. |
| **qig-memory** | Memory + inbox, namespace `bsuite`, prefix `bsuite_`. The precedent book. Coordination between lanes. |

### Skills — bound to purpose, read from `inventory.sh` (221), not the context listing

The context listing is budget-truncated and drops **never-used** skills first. Several below have
**zero recorded uses** and are the most relevant in the hub.

**Theme / D2C (Silo A):** `bsuite-brand-system` · `bsuite-page-grid-layout` ·
`*bsuite-branding-inheritance` · `bsuite-shared-ui-rollouts` · `bsuite-ship-visual-promote` ·
`*bsuite-fix-the-class-not-the-page` *(zero uses — the single most apt skill in the hub for this
operator)*

**Routes / surface (G5):** `web-frontend-backend-mapping` *(caveat: its description is written for
"every Python route has a corresponding TypeScript API client" — this estate is TS/Vite/Supabase;
the method transfers, the framing does not)* · `bsuite-gto-portals` · `bsuite-developer-portal` ·
`*bsuite-user-manuals-nav` · `*check-api-design` · `*test-exploratory-qa` · `test-playwright` ·
`*ops-deployment-readiness`

**Supabase — all of them:** `auth-supabase` *(this is D-2/D-109's skill — the Gmail consent
returning to the wrong app is a redirect_uri / authorised-origin problem)* ·
`bsuite-rls-authz-red-team` *(mandatory for any RLS / SECURITY DEFINER diff)* ·
`bsuite-reliability-red-team` · `*bsuite-supabase-migrations` · `*bsuite-edge-functions` ·
`db-supabase-migration` · `supabase:supabase` *(vendor, supersedes `db-supabase`)* ·
`supabase:supabase-postgres-best-practices` *(vendor)* · `auth-e2e-sso-testing` ·
`auth-oauth-local-testing` · `*bsuite-conduit-deploy-testing`

**Cross-cutting / one-shot:** `general-dry-one-shot-architecture` · `check-docs-vs-code` ·
`*bsuite-false-complete-gates` · `bsuite-react-testing`

**Orchestration:** `agent-run-master` *(first, always)* · `agent-skl-find` · `agent-run-subagents` ·
`agent-cli-cc-subagents` · `agent-run-parallel` · `agent-run-loop` · `agent-red-plan` ·
`agent-red-implement` · `agent-mem-comms` · `agent-mem-precedent-rule` ·
`agent-mem-precedent-clerk` · `agent-definition-of-done` · `ops-ship-all-apps`

**Domain — never guess an award or GTO fact:** `biz-au-award-boot` · `biz-au-award-modelling` ·
`biz-au-fair-work` · `biz-au-apprenticeship` · `biz-xero-integration`

**External CLI workers** for bulk mechanical passes: `grok-worker` · `qwen-worker` · `agy-worker` ·
`hermes-worker` (`-z` one-shot only). **Output is untrusted — review every diff.**

---

## §7 — PRE-AUTHORISED RULINGS. Braden is asleep. These ARE his answers.

Every one is **reversible on his word**. Record each application via the precedent clerk.

| # | Decision | **RULING**
|---|---|---|
| 1 | **Permissions defaults** (D-40/99/103) — 4 of 7 tenants have zero `role_capabilities` rows; the three that have rows disagree on up to 54 of 54 capabilities, so defaults **cannot be derived**. | **SHIP THE SAFE PATH.** When `loadRoleCapabilities` returns zero rows, pre-apply the **`read_only`** preset **UNSAVED**, with a banner: *"No permissions are configured for this organisation yet. This is a suggested starting point — nothing is granted until you press Save."* Non-destructive, least-privilege. **Do NOT seed `role_capabilities` on any real tenant.** |
| 2 | **`src/features/` — 601 dead lines** paralleling live code (`features/financial` 334 lines / 0 importers vs live `useFinancialStore`; `features/clients` 265 / 0). | **DELETE `features/{clients,financial,reports,settings}`. KEEP `features/contacts`** (3 genuine importers). Git history is the recovery path; record the SHA in the PR. Leaving two architectures is the only invalid answer. |
| 3 | **D-90 / D-62** — `r8-charge-rate-push` deployed, secret-authed, R8 never calls it because **R8 has no backend**. | **DO NOT BUILD TONIGHT.** Write an ADR in `docs/` naming the three options (give R8 a serverless route · invert to crm7-pulls · keep the manual paste) with a recommendation. Architecture with money implications is not an overnight call. |
| 4 | **D-58** — what "trade" means for MA000036 (Joinery). | **PARK.** Domain knowledge only Braden holds. Record the question precisely; do not guess an award fact. |
| 5 | **Grid inversion breaking change** (G1). | **AUTHORISED, gated on G0.** Storybook + the nested-chrome detector must exist and must demonstrably FAIL on today's estate first. |
| 6 | **`qa-signed-off` label.** | **The agent applies it** (Ruling V-1, 2026-08-19) — it records the AGENT's inspection. Apply only when the inspection actually happened, and write the evidence AND its limits into the PR. |
| 7 | **Promotion to `main`.** | **AUTHORISED on a genuinely passing gate.** Do not wait. `--merge` never `--squash` when head is `development`. |
| 8 | **Migration dispatch.** | **The agent runs it** — `gh workflow run supabase-migrate.yml --ref main -f submodule=all`. `--ref main` is load-bearing: the applier reads MAIN's gitlinks. Verify in the ledger afterwards, never trust the green run. |
| 9 | Anything else not covered. | **Rule from the precedent book, record it, proceed.** Prefer the narrowest safe interpretation. **Do not stop.** |

---

## §8 — PRIORITY ORDER

Ordered by how many times Braden has asked, not by technical convenience.

**P0 — the thing he is sick of asking for**
1. G0 Storybook + nested-chrome detector
2. G1 grid inversion (chrome, `w`)
3. G2 gradients on card headings · no pure white/black · aligned borders & radii · elevation on the `shadow-elev-*` ramp — **every app, every page**
4. G3 dnd-kit + columns proven working

**P1 — repeat requests**
5. **D-2 / D-109 email** — *"in excess of 20 times."* Google consent returns to the wrong app with the popup open → redirect_uri / authorised-origin mismatch. `email_integrations` still dual-writes plaintext `access_token`/`refresh_token`; **`smtp_password`/`imap_password` are ALREADY vault-only — do not "fix" those.**
6. **D-40/99/103 permissions** — ruling 1.
7. **D-70 draggable cards** — currently **61%, 370/603 pages**. Gap is BSU and braden.
8. **D-30/74/101/106 reporting** — **unblocked by PI RULING 25.1**: a report is a read-only saved question over the semantic layer; the explorer is an editable grid; deep-link, never embed.

**P2 — scoped and open**
9. D-76 dates — **an adoption gap**: `@bsuite/dates` is complete; **137 call sites bypass it**; R80.4 imports it zero times.
10. D-18 screenshots — the manual renderer has **no image block type**; the block must exist first.
11. D-46 R8 Jodie UI · D-105 margin (`ChargeRateCard.tsx:89–213` takes it as a typed input, not profit) · D-26 provider costs · D-108 duplicate contacts.

**P3 — coverage**
12. G5 the 553-route surface map. Currently **47 swept — 8%**.

---

## §9 — DEFINITION OF DONE

### Per item — six limbs, all of them

1. **The CLASS, not the instance** — a count of surfaces changed vs surfaces that exist, and they match or the residue is named.
2. **Proven in the running product**, by you, signed in, on the deployed SHA.
3. **The probe could see it** — state what it structurally cannot catch.
4. **A control that could have failed.**
5. **Verified by a lane other than the claimant.**
6. **Merged to `development`, promoted to `main`, production READY.**

### Per silo

- **Silo A:** the nested-chrome detector reports **0** across all six apps, having demonstrably reported **316** before the fix. `visual-probe.js` PASS on route × theme × width × account for every changed app. No `INCOMPLETE`.
- **Silo B:** every item either shipped to `main`, or `BLOCKED` with a named unblock. No item sits in `CLAIMED-DONE`.

### Per night

`agent-definition-of-done` D1–D7 with **APPROVE** or a recorded waiver. 7/7 repos on `development`,
in sync, `main` tree == `development` tree. Zero open PRs, or each open PR named with why.

---

## §10 — STANDING CONSTRAINTS

Production is `main` — **never direct-push**. Every commit **GPG-signed**, verified in the same
command as the push. **Never `git add -A`.** `.env.local` may be read, never committed, **never
printed**. Worktrees only under `~/Desktop/Dev/worktrees/`. **Never force-push.** Never commit in a
`MERGE_HEAD` worktree. One open PR per lane; cleanup in the same turn as the merge. Migration
versions checked globally across all seven scopes — one shared `schema_migrations` keyed on the
version string alone. **Guard every DDL against a rebuild-from-baseline** — `REVOKE`/`GRANT`/
`COMMENT ON` raise on a missing object, and a migration that cannot replay stops protecting anything
the day the DB is rebuilt. No real PII in any report — shapes and counts only.

---

## §11 — THE MEASUREMENT DISCIPLINE

**Fourteen measurement artefacts were caught in one session; NINE would have shipped as findings.**

Before reporting any absence, state **the second probe that could have found it and did not.**

- A **name**-shaped probe cannot find a **prop**-shaped mechanism (D-10 read as absent; it is built, wired through `@bsuite/ui` two repos away behind a 46-line DI shim).
- A guard **one call away** is invisible to a keyword scan (nearly reported a live cross-tenant IDOR that was correctly fixed).
- `to_regclass` cannot see a **function**.
- A parser blind to a nesting level reports **0 findings** on 175KB of data.
- `grep -A2` misses an attribute on line 3; a regex closes early on the `>` in `onClick={() => …}`.
- **Probe `origin/development`, never the working tree.**

**A green gate is a claim about the gate.** Where it samples, the sample is the claim.

---

## §12 — THE MORNING BRIEF

Written for Braden, not an engineer. Gloss every acronym. One ledger, and every item is exactly one
of: **`VERIFIED-DONE`** (checked by another lane) · `CLAIMED-DONE` · `IN-PROGRESS` · `BLOCKED` with
a named unblock.

Structure: what is closed and proven, with evidence · what is in production · what moved but is not
closed and **precisely where it stops** (file, line, branch, next step) · what pre-authorised
rulings were applied and what they changed · **what I got wrong**.

**A short honest list beats a long false one. Nothing at `CLAIMED-DONE` may be written as done.**
