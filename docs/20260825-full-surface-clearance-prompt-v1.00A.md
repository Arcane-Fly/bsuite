---
kind: plan
authority: operator
owner: bsuite
evidence:
  - scripts/audit-routes.sh
  - docs/nav/route-inventory.json
  - scripts/check-workflow-path-reachability.mjs
  - scripts/check-supabase-advisors.mjs
  - scripts/check-doc-classification.mjs
---

# FULL-SURFACE CLEARANCE — the prompt for the next thread

Supersedes the *executable prompt* in `20260825-overnight-ninety-item-clearance-directive-v1.00A.md`.
Counts corrected per `20260825-remeasured-clearance-brief-v1.00A.md`.

Operator instruction that shaped this version, 2026-08-25:
> *"make sure it includes a wide ranging set of skills particularly one that checks all routes and
> paths and leave no frontend backend mapping missing all supabase skills to be considered too."*

---

## §0 — THE PROMPT

> You own the entire BSuite estate. Every other lane and branch is closed.
>
> **Do NOT run a ninety-item fleet.** That number was wrong. ~45 register items were probed
> properly and **~30 are already delivered** — several citing the operator's own words in the code
> that implements them. Read `bsuite_register_remeasure_20260825`,
> `bsuite_register_remeasure_20260825_corrections`, and
> `docs/20260825-remeasured-clearance-brief-v1.00A.md` **before touching anything**.
>
> **THE GOAL IS SURFACE COVERAGE, NOT ITEM COUNT.** The estate has **553 routes** in
> `docs/nav/route-inventory.json`. The last sweep covered **47 — 8%**. Close that gap and leave no
> frontend↔backend mapping unaccounted for: every route to its data path, every data path to its
> RLS posture, every edge function to a caller, every caller to a deployed function.
>
> Run `/agent-run-master` first. Then work L0→L9 in
> `docs/20260825-full-surface-clearance-prompt-v1.00A.md`.
>
> **MEASURE BEFORE YOU BUILD.** Fourteen measurement artefacts were caught in one session and
> **nine would have shipped as findings**. Before reporting any absence, state the second probe
> that could have found it and did not. A name-shaped probe cannot find a prop-shaped mechanism;
> a guard one call away is invisible to a keyword scan; `to_regclass` cannot see a function.
>
> By morning the operator reads ONE ledger: every item `VERIFIED-DONE` (checked by a lane other
> than the claimant), `CLAIMED-DONE`, `IN-PROGRESS`, or `BLOCKED` with a named unblock. **A short
> honest list beats a long false one.**

---

## §1 — SKILLS, BY PURPOSE

Inventory read from `~/.agents/skills/agent-run-master/scripts/inventory.sh` — **221 skills**, not
the context listing (which is budget-truncated and drops the never-used ones first). `*` marks zero
recorded uses: those are the ones name-matching will not surface, and several below are exactly
what this run needs.

### Route, path and full-surface mapping — the operator's headline ask

| skill | use |
|---|---|
| **`web-frontend-backend-mapping`** | The named skill for this. **Caveat, stated because it matters:** its description is written for *"every Python route has a corresponding TypeScript API client"*. This estate is TS/Vite/Supabase with edge functions — the CONCEPTS transfer (route → client → backend → types), the literal Python framing does not. Use its method, not its examples. |
| **`*bsuite-fix-the-class-not-the-page`** | **Zero uses, and it is the single most relevant skill in the hub for this operator.** Every register item reported against one URL is presumed a class until proven otherwise. |
| `bsuite-gto-portals` | The external portal surfaces — worker/apprentice, host employer, field officer. D-34's territory. |
| `bsuite-developer-portal` | `business-suite-unified/src/pages/Developer/**`. |
| `*bsuite-user-manuals-nav` | `/docs` nav wiring — D-18's surface. |
| `*check-api-design` | REST shape, status codes, request/response schemas. |
| `*test-exploratory-qa` | End-to-end navigation with screenshots and console capture. |
| `test-playwright` | The E2E harness itself. |
| `*ops-deployment-readiness` | Env vars, migrations, health endpoints before promotion. |

**Existing tooling — use it, do not rebuild it:**
`scripts/audit-routes.sh` · `docs/nav/route-inventory.json` (553 routes, 362 KB) ·
`scripts/check-workflow-path-reachability.mjs` · `scripts/check-docs-source-paths.mjs` ·
`business-suite-unified/src/data/route-inventory.json` (BSU's own).
CI already runs `Route inventory is declared and non-empty` and `Per-page checks on SIGNED-IN routes`.

### Supabase — all of them, per the operator's instruction

| skill | use |
|---|---|
| **`auth-supabase`** | OAuth 2.1 server, multi-app SSO via PKCE, social login (Google/Microsoft). **This is D-2/D-109's skill** — the Gmail consent returning to the wrong app is a redirect_uri / authorised-origin problem, and this skill owns that ground. |
| **`bsuite-rls-authz-red-team`** | Any diff touching RLS migrations, SECURITY DEFINER functions, or the db-proxy allow-list. **Mandatory for anything in §4's security lane.** |
| `bsuite-reliability-red-team` | Multi-tenant money paths and blast radius before a roadmap ships. |
| `*bsuite-supabase-migrations` | Writing the SQL files. Zero uses. |
| `*bsuite-edge-functions` | BSU edge fns, `platform-kit-proxy`, RLS mutations. Zero uses. |
| `db-supabase-migration` | Project-lifecycle operations (region moves, project migration). |
| `supabase:supabase` (vendor plugin) | **Supersedes `db-supabase`.** Vendor-maintained, auto-updates — prefer it. |
| `supabase:supabase-postgres-best-practices` (vendor) | **Supersedes `machine-db-postgres-best-practices`.** |
| `auth-e2e-sso-testing` · `auth-oauth-local-testing` | E2E and local preview against BSU SSO — needed to test D-2 without hand-driving a browser. |
| `*bsuite-conduit-deploy-testing` | conduit's `d.*` deploy via BSU OAuth. |
| **Supabase MCP** | `list_tables`, `execute_sql`, `get_advisors`, `list_migrations`, `list_edge_functions`. **Never infer a column or a grant — query it.** |

### Cross-cutting, DRY and one-shot

`general-dry-one-shot-architecture` · `bsuite-shared-ui-rollouts` · `bsuite-page-grid-layout` ·
`bsuite-brand-system` · `*bsuite-branding-inheritance` · `check-docs-vs-code` ·
`*bsuite-false-complete-gates`

### Orchestration, ruling and closure

`agent-run-master` (first, always) · `agent-skl-find` · `agent-run-subagents` ·
`agent-cli-cc-subagents` · `agent-run-parallel` · `agent-red-plan` · `agent-red-implement` ·
`agent-mem-comms` · `agent-mem-precedent-rule` · `agent-mem-precedent-clerk` ·
`agent-definition-of-done` · `ops-ship-all-apps` · `bsuite-ship-visual-promote`

### Domain — do not guess award or GTO facts

`biz-au-award-boot` · `biz-au-award-modelling` · `biz-au-fair-work` · `biz-au-apprenticeship` ·
`biz-xero-integration` · `bsuite-react-testing`

---

## §2 — LANDMARKS

Each landmark names what must fire. A landmark reached without its named skill having run, and
without a recorded outcome, is not reached.

**L0 INVENTORY** — `agent-run-master`; `inventory.sh` (read the script, not the listing);
`agent-skl-find` to bind each class below to its skill; `memory_list({prefix:"bsuite_"})`;
`inbox_list` namespace `bsuite`.

**L1 PRINCIPLES** — `agent-mem-precedent-rule` + `agent-mem-precedent-clerk`. Extract the precedent
book as ≤20 PRINCIPLES with the test that proves each held. Rule from it; do not wake the operator
for anything it reaches.

**L2 THE SURFACE MAP** — *the heart of this run.* Build one table with a row per route (553) and
these columns, and **do not stop until every row is filled or explicitly marked UNREACHABLE**:

```
route · app · auth required · component · data hook/store · table(s) or RPC ·
RLS posture · edge fn (if any) · fn deployed? · caller exists? · tenant-scoped? · verdict
```

Sources already present: `docs/nav/route-inventory.json`, `scripts/audit-routes.sh`,
Supabase MCP `list_tables` + `list_edge_functions` + `execute_sql` on `pg_policies`.
`web-frontend-backend-mapping` supplies the method.

**Every asymmetry is a finding**, and each has a precedent in this estate:
an edge function with no caller (`r8-charge-rate-push`, D-90) · a caller with no deployed function
(`crm7-generate-document`, corrected 2026-08-25) · a table with RLS enabled and zero policies ·
a SECURITY DEFINER function reachable by `anon` (`is_platform_admin`, fixed 2026-08-25) ·
a route with no data path · a data path no route reaches.

**L3 NIGHT-BLOCKERS** — `agent-mem-comms`. ONE batch, at the START, as lay briefs. The four known
decisions are in §4. Everything else you rule yourself and record.

**L4 FAN OUT** — `agent-run-subagents` + `agent-cli-cc-subagents`. One worktree per lane under
`~/Desktop/Dev/worktrees/`. Implementer → spec reviewer → code-quality reviewer, with the re-review
loop. Never two implementers in one repo.

**L5 IMPLEMENT** — `agent-red-implement`. Gate A (context7 + installed source) before the first edit
on any library. Supabase MCP for every schema claim. Migrations AUTHORED from a lane; applied by
`gh workflow run supabase-migrate.yml --ref main -f submodule=all`. **Guard every DDL against a
rebuild-from-baseline** — `REVOKE`/`GRANT`/`COMMENT ON` raise on a missing object, and a migration
that cannot replay stops protecting anything the day the DB is rebuilt.

**L6 PROVE** — `bsuite-ship-visual-promote`. Route × theme × 1440/1024/768/390 × account.
**Unregister the service worker first** — crm7 is a PWA and it will serve you the previous build.
Two tenants for anything role-, licence- or RLS-scoped. INCOMPLETE never clears the gate.

**L7 CROSS-CHECK** — `agent-definition-of-done` D1–D7, verified by a lane other than the claimant.

**L8 SHIP** — `ops-ship-all-apps`. feat → development → main by PR. `--merge` never `--squash` when
the head is `development`. Branch and worktree cleaned in the same turn. A promotion is seven PRs
plus the gitlink invariant: **parent main's gitlink must sit on the submodule's main.**

**L9 BRIEF** — write for Braden, not an engineer; gloss every acronym. Leave `development` in sync
with `main` on all seven repos.

---

## §3 — THE BAR

Six limbs, all of them, or it is PARTIAL with the stopping point named (file, line, branch, next step):

1. the CLASS, not the instance — with a count of surfaces changed vs surfaces that exist
2. proven in the running product, by you, signed in, on the deployed SHA
3. the probe could actually see it — say what it structurally cannot catch
4. a control that could have failed
5. verified by another lane
6. merged to `development`, promoted to `main`, production READY

**PARTIAL honestly reported is acceptable. A false DONE is not.**

---

## §4 — THE FOUR DECISIONS ONLY THE OPERATOR CAN MAKE

Send as one batch at L3. Do not trickle.

1. **Permissions defaults (D-40/99/103).** A DATA gap, not a missing feature. 4 of 7 tenants have
   zero `role_capabilities` rows including `bsuite Platform`. The defaults **cannot be derived** —
   the three tenants that have rows disagree on up to **54 of 54** capabilities. Either name the
   posture, or approve the safe path: an empty-state that pre-applies the `read_only` preset
   **unsaved**, granting nothing until Save.
2. **D-90 / D-62 push a quote to crm7.** `r8-charge-rate-push` is deployed, secret-authed, and R8
   never calls it — by design, it is server-to-server and **R8 has no backend**. Give R8 a
   serverless route, invert to crm7-pulls, or keep the manual paste.
3. **D-58** — what "trade" means for MA000036 (Joinery).
4. **crm7 `src/features/`** — 601 dead lines paralleling live code. Delete, or finish the migration
   onto feature modules. Leaving both is the only invalid answer.

---

## §5 — WHAT IS ALREADY CLEAN (do not re-do it)

types **0 errors** all six apps · lints **0 errors 0 warnings** all six apps · advisors **0 ERROR** ·
migrations **0 pending** · 7/7 repos on `development` with `main` tree == `development` tree ·
6/6 gitlinks on their submodule's main · 14 remote branches · 1 worktree.

**Not swept, stated so it is not read as covered:** theme beyond a 47-route sample (8%), UX,
and the remaining 506 routes. That is L2's job.
