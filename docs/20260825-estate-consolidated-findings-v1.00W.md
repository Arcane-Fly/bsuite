# BSuite estate — consolidated findings & roadmap

**v1.00W · 2026-08-25 · Point-in-time snapshot**

Compiled by PI from all 15 dispatch lanes, the scheduled supervisor and 7 CLI agents.
**Verified against the live estate before landing** — see §0 for what was corrected.

> **Scope.** This document covers **the BSuite product and codebase only**: what lives in the
> seven repos and the running system. Findings about the *agent operating environment* —
> skills resolution, session channels, silo guards, lane accountability — are **deliberately
> excluded** and live at `~/.agents/docs/20260825-agent-operating-environment-findings-v1.00W.md`.
> The `bsuite-*` skill prefix means *"about bsuite"*, not *"part of bsuite"*.
> Where an agent-environment defect has a product consequence, that consequence is recorded
> here and cross-referenced `[AGENT-ENV]`, never duplicated.

> **Evidence convention.** `VERIFIED` = checked against production by a party other than the
> claimant. `CLAIMED` = a lane reported it; not independently checked. `UNKNOWN` = could not
> be measured. **A lane's own report is not evidence.**

> **Every count drifted by tens within hours during the campaign. Re-measure before acting.**

---

## 0. Corrections applied before landing

The source compilation was checked claim-by-claim against production, the repos and CI run
history. **Six claims were refuted or materially restated, three new findings emerged, and one
correction runs the other way — against this estate's own registers.**

### 0.1 Refuted or restated

| Ref | As compiled | As measured 2026-08-25 |
|---|---|---|
| **S-2** | *(the compilation was right — see 0.3)* | — |
| **Z-1** | `role_capabilities`: 1,296 rows, **nothing reads it** | **1,404 rows**, and **one read call site** — `business-suite-unified/src/lib/admin/saveRoleCapabilities.ts:29` → `src/pages/Admin/PermissionsEditor.tsx`. Restated below; it is not a zero-consumer table, it is a table read by one admin editor and consulted by no authorisation decision |
| **S-3** | `r7_jobs` public limb **unconditional** | Limb is `((status = 'open') AND (published_at IS NOT NULL))` — **conditional**. It is *cross-tenant*, mirroring `r7_jobs_select_anon` by design. Restated as "cross-tenant public job-board limb", not "unconditional" |
| **S-4** | `boot_assessments` grants `field_officer` via `auth_tenant_id_with_role`, which reads `role` — policy likely never matched | **REFUTED — deleted.** `field_officer` is granted via `check_user_portal_role()`, which reads `portal_role` correctly. `auth_tenant_id_with_role` is only ever passed `owner/admin/manager`, all genuine `role` values. No mismatch exists |
| **I-4** | pg_cron self-test asserts `FIRED=1`, gets `FIRED=2`; masks a real failing job | **STALE — the self-test was already repaired.** Current workflow uses a synthetic-probe design (`BEFORE`/`AFTER`/`PROBED`/`CLEAN`); run 32794921123 measured `BEFORE=1 AFTER=2` — it moved by exactly 1, so the self-test **passed**. The audit is now failing **correctly**, on a real job. Restated as **N-3** below |
| **I-8** | `wic_rate_lookup` index absent from production | **REFUTED (stale).** Three indexes present: `wic_rate_lookup_pkey`, `wic_unique_scoped`, `idx_wic_rate_lookup_tenant_id`. The named-absent one landed via `R80.4/supabase/migrations/20260901010000_wic_rate_lookup_tenant_id_fk_index.sql` |
| **I-3** | Pointer writer dead at **135/135** | **162 failures of 168 runs**; latest `2026-08-25T03:31 failure`; last 12 consecutive all failures. Finding stands, number updated |
| **Airtable** | `BrowseDataTab.tsx:1058` | **Line 1060.** Exact string: *"Pick an entity above to see its rows — search by name, or browse grouped by area."* Finding stands |
| **Notes register** | — | **The register is 103 items, D-1…D-103.** An earlier pass (mine, `20260824-estate-execution-backlog-v1.00W.md` Lane 3) carried a **20-item subset** as though it were the whole document. Full register now at `docs/20260825-operator-notes-register-d1-d103-v1.00W.md` |
| **Open issues** | — | **183 open estate-wide** at 2026-08-25 11:39 (bsuite 54 · crm7 96 · BSU 15 · R80.4 7 · conduit 5 · braden 3 · throughput 3). Was 178 on 08-24 |

### 0.2 New findings, not in the compilation

| # | Finding | Status |
|---|---|---|
| **N-1** | **`browse.tenant_encryption_keys` is granted `SELECT` to `authenticated` and selects `wrapped_key`.** It is safe *today* only because `reloptions={security_invoker=true}` forces the base-table permission check and RLS to run as the caller, who has no base-table grant. **It is one attribute-flip from exposing wrapped DEK material.** Recommend a tripwire test asserting `security_invoker=true` persists on that view — **not** reopening P0-1 | **VERIFIED** |
| **N-2** | **Seat counting is worse than S-5 states.** It is not merely counting `team_members` instead of `user_tenants` — it counts **one selected team's** rows. `Admin/TeamMembers.tsx:195,249` pass `membersQuery.data?.length` from `listTeamMembers(selectedTeamId)` → `teamMembersService.ts:139-141` `.from('team_members')`. `seatCap.ts` is pure; its own doc-comment hedges *"typically team members **or tenant users**"* | **VERIFIED** |
| **N-3** | **`document-retention-sweep-daily` is failing BY DESIGN, pending operator seeding — and the exact remedy is already written down.** Not hidden: the repaired audit surfaces it correctly and fails closed. Per `20260822080000_document_retention_destruction_sweep.sql` (merged in crm7 PR #1811, 2026-08-18) the job **requires**: `vault.create_secret` for **`document_retention_sweep_url`** and **`document_retention_sweep_secret`**, plus **`DOCUMENT_RETENTION_SWEEP_SECRET`** set as an edge-function secret (`supabase secrets set`) — **the same value in both places**. Its own note: *"Cron job will RAISE EXCEPTION loudly until seeded (by design, not a bug)."* Byte destruction **must** go through the edge function — a raw `DELETE FROM storage.objects` does not remove the backend object. **Document retention is a compliance obligation and has been unmet since 2026-08-18.** No agent can conjure a secret | **VERIFIED — operator action, remedy known** |
| **N-4** | **26 documents across 7 tenant/category groups were never backfilled to encrypted** (`drivers_license`, `passport`, `superannuation_choice_form`, `photography_consent`). This is **deliberate, not an oversight**: `encrypt_existing_category` is gated to a real org owner/admin session for accountability, and no service-role path can satisfy it without forging a user identity — **which was correctly refused**. Closed by an org admin via *Settings → Document Categories → "Start encryption pass"*, or `crm7/scripts/reencrypt-sensitive-documents.mjs --tenant <uuid> --category <cat> --apply` with their own token. `security_signals` detector 2 flags it automatically while it stays open | **VERIFIED — org-admin action** |

### 0.3 The correction that runs against this estate's own registers

**S-2 `tenant_encryption_keys` — the compilation was right and two of our own documents are wrong.**

Measured on production:

```
grantee       privileges                                              grantable
postgres      SELECT INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER  YES
service_role  SELECT INSERT UPDATE DELETE TRUNCATE REFERENCES TRIGGER  NO

relacl              = {postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres}
relrowsecurity      = true
relforcerowsecurity = true          <-- our registers said false
pg_policies count   = 0
has_table_privilege('authenticated', …, 'SELECT') = false
has_table_privilege('anon',          …, 'SELECT') = false
```

Both limbs of the standing claim are false: **there is no `anon`/`authenticated` grant of any
kind, and force-RLS is on, not off.** With RLS enabled, zero policies is a default-deny;
force-RLS additionally subjects the owner to it; `service_role` bypasses via `BYPASSRLS`, which
is the intended server-side unwrap path.

### It is not a false positive. It was **fixed eight days ago, and three documents restated it anyway.**

The grants *were* there. They were revoked by
`crm7/supabase/migrations/20260820010000_tenant_encryption_keys_revoke_anon_grants.sql` — the
filename says exactly what it does — merged in **crm7 PR #1811 on 2026-08-18T09:54:53Z**.

And a memory record written **2026-08-17** already said so, in these words:

> *"FOUND ALREADY DONE (verified live against `tuybltdrdefjblnplpqo` before building anything new
> — **do not re-fix**): `tenant_encryption_keys` anon/authenticated grants REVOKED + FORCE RLS
> applied, migration `20260820010000`, confirmed live (`role_table_grants` shows only
> postgres/service_role; `relforcerowsecurity=t`)."*
> — `bsuite_project_pii_encryption_retention_breach_20260817`

**So this is not a measurement error. It is the estate's own recurring failure, occurring inside
the register that exists to prevent it:** a fix landed, a record said so and said *do not re-fix*,
and v3 P0-1 was published the same day still asserting the original finding — then carried
unchanged into the 08-24 backlog, then into the 08-25 compilation. **Three documents restated a
finding a fourth had already closed.** Nobody read the record.

**The same record names a second instance:** `docs/20260817-au-compliance-audit-v1.00W.md` §2.5
calls the retention/archive work *"not built"*; it was **fully built and applied** at
`20260812164500` + `20260812210000`, and that audit's own confidence section admits **no live DB
query was run for it**.

**A preventative gate for this exact class already exists and is running.**
`20260822070000_security_signal_detection.sql` ships an `rls_enabled_zero_policy_with_grant`
detector, described in its own source as catching *"the NEXT `tenant_encryption_keys`-class
incident"*. It is a working precedent for the zero-consumer gate at Lane 0 item 8 — **that gate
does not need inventing, it needs extending.**

**Superseded under the precedent rule (newer binds):**

| Document | Statement | Disposition |
|---|---|---|
| `docs/20260817-estate-remaining-work-register-v3.00W.md` **P0-1** | *"grants full CRUD to `anon` and `authenticated`… `relforcerowsecurity=false`"* | **SUPERSEDED — already fixed by `20260820010000`, merged 2026-08-18. Close.** |
| `docs/20260824-estate-execution-backlog-v1.00W.md` **Lane 1.1** | same claim, carried as a live P0 | **SUPERSEDED — remove from Lane 1.** Replaced by **N-1** (tripwire, P2) |
| `docs/20260817-au-compliance-audit-v1.00W.md` **§2.5** | retention/archive *"not built"* | **SUPERSEDED — built and applied** at `20260812164500` + `20260812210000`. The audit admits no live query was run |

This is the correct outcome and it should be noticed twice over. **Refusing to "fix" S-2 was
right** — with RLS on, zero policies *is* the denial, and adding a policy would have widened
access. And **the fix had already landed**, so a "remediation" would have been a no-op at best.

**The generalisable lesson is not about encryption keys.** It is that this estate has a working
habit of writing down *"already done — do not re-fix"* and then not reading it. Two of the three
documents that restated P0-1 were written **after** the record that closed it. The cheapest
possible gate is a register-hygiene check: **before a P0 is carried forward unchanged into a new
register, re-measure it or cite the measurement.** v3 P0-1 says *"Carried from v2, unchanged"* in
its own evidence column — that phrase should have been the trigger.

---

## 1. Executive position

**The estate is safe. It is not production-ready, and not close.** No app passes the readiness
bar. R80.4 is weakest on correctness; throughput weakest on accessibility.

Nothing is at risk of loss. All seven repos have `development` contained in `main`. 95 branches
that existed on one machine only were pushed to remote. Branch sprawl peaked at 166 local in
bsuite and was drained to 78–82.

**The structural finding of the campaign:** in six of ten of the operator's long-standing
complaints, **the machinery was built and the wiring was never done.** A token minted and never
consumed. An RPC with zero callers. A permissions model of 1,404 rows read by exactly one admin
editor and consulted by no authorisation decision. A consent model whose columns no policy
references. This is why the estate reads as *"half arsed"* — it is, specifically and
structurally, **half-wired**.

**The second:** gates have been passing because they never ran. **Three confirmed instances.**
A green check in this estate is not currently evidence of anything — see §7.

---

## 2. What landed

### VERIFIED — independently checked against production

| Item | Evidence |
|---|---|
| **Migration reconciliation** | 877 files / 8 scopes / 748 ledger rows, verified by `datum` with positive controls. **Zero phantoms** |
| **`profiles` privilege escalation closed** | `has_column_privilege()` before/after on 4 columns; control column retained writable |
| **Cross-tenant security claim refuted** | Checked at the live layer — false alarm |
| **Branch drain** | 132 local / 95 remote / 8 worktrees removed, each proven by `git merge-base --is-ancestor` |
| **Takeover post did not execute** | Zero forced updates on any `development`/`main`; all resets predate the post; landmines intact at exactly 105/28/194 files |
| **`invite_team_member_guarded` 400 root cause** | `team_invitations_role_check` permits only `admin\|member` |
| **`r7_jobs` cross-tenant limb** | Policy read from production and quoted in §3.3 |
| **`tenant_encryption_keys` is NOT exposed** | §0.3 — grants, force-RLS and `has_table_privilege` all measured |
| **pg_cron audit self-test is repaired and working** | Run 32794921123: `BEFORE=1 AFTER=2`, moved by exactly 1 |
| **`wic_rate_lookup` indexes present** | 3 indexes live, incl. the one reported absent |

### CLAIMED — awaiting independent verification

| Item | Why it matters |
|---|---|
| **Publish circularity broken** | The dam for the whole estate. Lane reports `next`/`latest` dist-tags proven end-to-end with a real deploy |
| **Migration reconciliation methodology** | Result verified; the *bucketing choices* were not re-derived by a second party |

### Delivered artefacts

- Schema builder remediation spec (1,034 lines)
- Border/elevation token system spec
- Reporting consolidation ADR
- Estate execution backlog (`20260824-…-v1.00W.md`)
- Consolidation assessment
- **Operator notes register — 103 items, D-1…D-103** (`20260825-operator-notes-register-d1-d103-v1.00W.md`)
- Two Tier-1 constitutional precedent records

---

## 3. Findings

### 3.1 Repository instrumentation — *gates in `.github/workflows` that pass without running*

| # | Finding | Status |
|---|---|---|
| **I-3** | **Submodule-pointer writer dead — 162 failures of 168 runs**, last 12 consecutive. A submodule clone failure is not distinguished from a legitimate branch-head read, so the script falls through to the parent's own HEAD and offers it for all six submodules; the descendant check correctly refuses every time. Cause of gitlink drift (#2306) | **Open — VERIFIED** |
| **I-5** | **Pending-encryption watch** positive control no longer detects its synthetic case; encryption-at-rest unmeasured. Fails closed, which is correct doctrine — do not "fix" it by loosening the gate | **Open — CLAIMED** |
| **I-6** | **`publish-eslint-config.yml` reports success while `@bsuite/eslint-config` 404s on npm.** A publish gate that cannot see a failed publish, in the pipeline that ships the lint rules | **Open — VERIFIED** |
| **I-7** | **Typecheck gate scoped to `*/supabase/functions/**`** — a path **no parent diff can ever contain**, because submodules are gitlinks. Green because it never fires | **Open — VERIFIED** |
| **I-9** | Migration version collision `20260829030000` — one won, one silently never ran | **Fixed (R80.4#199)** |
| **I-11** | **GPG signing is a minority in every repo, and every `development` tip is unsigned.** Measured: `%G?` = `E` on all seven tips. Signed in last 75 commits — bsuite 28, crm7 30, throughput 21, braden 18, BSU 17, conduit 13, **R80.4 0 of 75**. Unsigned commits make Vercel silently cancel deploys, **so any gate result may be reading a stale build** | **P0 — VERIFIED. No green gate should currently be trusted** |
| **N-3** | **`document-retention-sweep-daily` genuinely failing**, blocked on an operator vault secret. The repaired audit surfaces it correctly and fails closed. A compliance obligation currently unmet | **Open — VERIFIED, operator action** |

*Withdrawn: I-4 (self-test already repaired, §0.1) · I-8 (index present, §0.1).*
*`[AGENT-ENV]` consequence recorded in §3.6: gate verdicts banked across two divergent copies of the visual-gate protocol are not comparable.*

### 3.2 Zero-consumer — *built, never wired*

| # | Finding | Status |
|---|---|---|
| **Z-1** | **`role_capabilities`: 1,404 rows, one reader, zero authorisation decisions.** Read only by `saveRoleCapabilities.ts:29` for the `PermissionsEditor` admin screen; real access decisions are made by hardcoded checks elsewhere. **Not a zero-consumer table — a zero-*authority* one**, which is the more dangerous shape: it looks live | **Open — VERIFIED (restated)** |
| **Z-2** | **Candidate consent columns referenced by no policy.** `consent_to_pool`, `consent_withdrawn_at`, `consent_to_share_with_hosts` on `public.r7_candidates`; regex over `pg_policies.qual \|\| with_check` → **0 rows estate-wide**. Pool visibility unimplemented; **withdrawal enforces nothing.** A consent obligation, not tidiness | **Open — VERIFIED** |
| **Z-3** | **`--app-accent` unadopted** — consumers read `--role-accent`, so BSU developer-console panels render CRM7 cyan regardless of declared brand. *(Scope note: the estate-wide form of this claim was overstated in an earlier spec — 100 occurrences across 24 files do consume it. The defect is real for the BSU panels.)* | **Open — VERIFIED (scoped)** |
| **Z-4** | `@bsuite/jodie`, `@bsuite/eslint-config`, `@bsuite/tsconfig` published, reached by zero apps | **Open — CLAIMED** |
| **Z-5** | **`rate_adjustments` + `billing_cycles` have zero application reach.** Both tables exist; **0 read call sites**; the only three `src/` hits are prose comments | **Open — VERIFIED** |
| **Z-6** | `gto_complaints.external_referral` unread | **Open — CLAIMED** |
| **Z-7** | **`tracks-changes` tag with zero readers** telling users *"audit columns enabled"*; a sort hardcoded `[]` under text promising persistence. Two UI surfaces asserting behaviour that does not exist | **Open — VERIFIED** |

### 3.3 Security & access

| # | Finding | Severity |
|---|---|---|
| **S-1** | `profiles` subscription-column INSERT allowed self-granting enterprise tier with a 99-year trial while the identical UPDATE was refused | **FIXED in production** |
| **S-2** | `tenant_encryption_keys` — **false positive, closed.** See §0.3 | **No action** |
| **N-1** | **`browse.tenant_encryption_keys` grants `SELECT` on `wrapped_key` to `authenticated`**, safe only via `security_invoker=true`. One attribute-flip from exposure | **P2 — add a tripwire** |
| **S-3** | **`r7_jobs` cross-tenant public job-board limb.** Verbatim: `((status = 'open') AND (published_at IS NOT NULL))`. Any authenticated user sees any tenant's open+published jobs. **Not a breach** — mirrors `r7_jobs_select_anon` by design — but it violates the stated product rule (§4.2: *"job activity is tenant-gated"*) and pollutes the internal view | **Queued** |
| **S-5 / N-2** | **Seat counting measures one selected team's `team_members`**, not tenant-wide `user_tenants` licensing. Commercial defect | **Queued — VERIFIED** |
| **S-6** | Supervisors from other host employers selectable on a placement | **Triage incomplete** |
| **S-7** | **Local Supabase CLI is linked to the wrong project.** `supabase/.temp/project-ref` = `yhwlnehzclclnkpxjepc` = `supabase-business-suite-sydney`, ap-southeast-2, ACTIVE_HEALTHY, **0 public tables**. Production is `tuybltdrdefjblnplpqo` (us-east-1). **A `db push` would target the empty project and report success.** Remedy is a repo-level guard asserting the ref before push, not just an unlink | **VERIFIED — act** |

*Withdrawn: S-4 (refuted, §0.1).*

### 3.4 UX / product

| # | Finding |
|---|---|
| **U-1** | Schema builder could not create a relationship, and had not since 3 May — insert sent 4 columns dropped by migration `20260503000001`. Zero rows, zero edges, 3.5 months dead. **Fixed** |
| **U-2** | Tailwind v4 Preflight `*{margin:0}` overrides UA `dialog{margin:auto}` — all five native dialogs render at viewport top-left. One-line fix. **Fixed** |
| **U-3** | `minZoom` never set → `fitView` clamps at 0.5 → field text at 4.5–7 device px. **Fixed** |
| **U-4** | Zoom controls unreachable — canvas overshoots and `scrollHeight == innerHeight` |
| **U-5** | `colorMode` never set → MiniMap keeps the library's `#fff` → grey rectangle + a pure-white conformance FAIL. **Fixed** |
| **U-6** | Empty state is a dead end — *"Create your first entity"* with no way to. **Fixed** |
| **U-7** | **No `:focus-visible` in throughput** (own Button, no ring, 146 raw `<button>` vs 5 `<Button>`) **and R80.4** (no primitive at all). **91.3%** of interactive elements sit in files with no focus reference. WCAG 2.4.7 |
| **U-8** | Card/border nesting — GridItem and Card are byte-identical, drawn 1px apart: six edge strokes for one card. Accent lives in a `box-shadow` ring, not `--border` |
| **U-9** | Light mode collapses — border contrast 1.12:1, surface separation ΔL 0.002 |
| **U-10** | Sidebar clips its own text (*"ashboard"*). Root cause is **not** the Dashboard item: `TransitionNavLink` takes three props and spreads nothing while used as a Radix `Slot` child in **three** places, so every `className`, `data-*`, ref and handler `Slot` injects is dropped |
| **U-11** | **184 distinct border-colour utilities, 42 radii, 251 resting accent borders vs 79 state-variant (3.2:1).** No single source of truth: `--border-color` has 3 values, `--radius` 4 mechanisms |
| **U-12** | Six duplicated reporting/data surfaces violating the one-shot rule |

### 3.5 Process & governance — *the parts enforced in this repo*

| # | Finding |
|---|---|
| **P-1** | **Closure scope.** An adversarial re-check reopened **25%** of a closure pass (10 of 40). Evidence true, scope wrong: headline answered, named second half silent. **Nothing enforces scope at closure time — and note that no CI gate does this today; that is precisely why it failed.** The remedy is a gate that does not yet exist |
| **P-3** | **Branch sprawl was production without disposal**, not a blocked drain. 18 branches merged the same day the estate hit peak sprawl. Every repo in breach except R80.4. *(Observation is in this repo's git history; the behavioural remedy — branch-budget compliance — is `[AGENT-ENV]`)* |
| **P-4** | **No lane marker in git — every branch authored `GaryOcean428`.** Per-agent compliance is **not computable** across this estate's history, which makes every recorded rule unenforceable against an individual. *(Observation here; remedy is `[AGENT-ENV]`)* |

### 3.6 Consequences of agent-environment defects — *cross-references, not duplicates*

| Consequence in this estate | Root cause (see `~/.agents/docs/…`) |
|---|---|
| **Gate verdicts banked this month are not comparable to each other** — the visual-gate protocol exists in two copies three weeks apart, one with the probe script and one without. Any promotion decision citing a banked visual verdict must be re-run against the canonical copy before it is trusted | AE-2 |
| **Per-agent accountability is incomputable across this repo's git history** | AE-4 |
| **A `CLAUDE.md` change does not reach a session that already loaded it** — so a doctrine update landed in this repo is not in force until sessions restart | AE-5 |

### 3.7 Repeatedly requested, still not delivered

| Item | Times raised, his words | State |
|---|---|---|
| **Client SMTP / Google / Azure email** | *"in excess of 20 times"* | `crm7#1705` open — insecure **and** non-functional (plaintext columns, read path expects Vault) |
| **Permissions default-checked** | Raised **three times** — D-51, D-97, D-103 — *"insisted on many times"* | `PermissionsEditor.tsx` has **no default logic at all** |
| **dnd-kit card independence** | *"raised innumerable times"*, *"Every page on every app"* | **No estate-wide issue has ever existed** |
| **Airtable-style data view** | *"directed to fix many times"*, *"asking for and documented this whole time"* | Announced delivered 2026-08-08; `BrowseDataTab.tsx:1060` still says *"Pick an entity above to see its rows."* **crm7#1477 never closed — delivery announced over an open issue** |
| **RAMS funding matrix** | Ratified as an **ADR** | `to_regclass('public.rams_funding_matrix')` = **null**. **112 days.** Funding still hand-keyed |
| **R8 allowances + MA000036 trade selector** | *"This WAS working"* | **Regressions, not gaps** |
| **Commercial construction sector** | 2× | Money path, still wrong |

Full register of all 103 asks: `docs/20260825-operator-notes-register-d1-d103-v1.00W.md`.

---

## 4. Constitutional model — Tier 1, operator only

### 4.1 Licensing, personas, seats

- **`user_tenants.role` = licensing + authority.** `owner|admin|manager|staff` consume a seat. **`guest` consumes none.**
- **`user_tenants.portal_role` = persona only.** No licensing meaning.
- **Platform/developer** = `profiles.platform_role='developer'` — uncapped, unbilled.
- **Every external portal user must be `guest`.** A non-guest external user is a billing defect *and* a privilege defect simultaneously.
- **A field officer is staff** — internal, seat-consuming, never `guest`. *"Portal"* denotes **form factor**, not an external boundary.
- **Caseload is a database rule, never a page filter.** The mobile view presents already-scoped rows.

### 4.2 Candidates, pool and tenancy

- Job activity is **tenant-gated**. A GTO must not see another GTO's postings from the inside. *(S-3 is the live violation.)*
- **Anything public — a job ad that can be applied for — is pool-worthy.**
- **Two separate consents, both the candidate's:** (1) first entry gates them to the GTO applied to; (2) election to see the pool *and* be visible to other organisations. *(Z-2: neither is enforced.)*
- **On employment, everything gates to the tenant** — payroll, employment details.
- **School-based and trainees are variants of apprenticeships**, differing on duration, qualifications and training method. **School-based has a school attached** — no school relation currently exists, a **modelling gap, not wiring**.
- **Self-managed enterprise** = GTO/labour-hire equivalent, **except it cannot bill external clients**. An **entitlement** (`tenant_features`), not a role. Sub-orgs via `parent_tenant_id` / `tenant_subtree_ids()`.

### 4.3 Reports vs explorer

- **A report is a read-only saved question** over the semantic layer, scoped by `report_scope`, schedulable, deliverable.
- **The data explorer is an editable grid** over records, one owning surface.
- A report may **deep-link** to the owning app's editor. It never embeds one.
- **This collapses the six duplicated surfaces into two** and settles B-1.

### 4.4 Standing quality rules

1. A closure **enumerates every acceptance criterion**, each marked met or explicitly carried forward.
2. **Zero consumers is not done.**
3. `INCOMPLETE` is not a `PASS`. Any UNKNOWN class makes the gate INCOMPLETE.
4. **Pre-existing is not nothing.**
5. **Verify behaviour, not presence.**
6. A DONE claim is unverified until a lane **other than the claimant** checks it.
7. **Branch budget** — one open PR per lane; cleanup same-turn; no branch without an intended PR.
8. **No mass rename or estate-wide mechanical change without a PI ruling.**
9. Migration versions checked **globally**, across every repo.
10. Ownership is **assigned, never self-declared**.

---

## 5. Roadmap

### Lane 0 — Restore the instruments *(nothing measured above this is trustworthy)*

1. **GPG signing (I-11) — P0.** Until resolved, no green gate is evidence. Repo half: required-signature branch protection. *(Agent half is `[AGENT-ENV]` AE-11.)*
2. **Submodule-pointer writer** #2306 (I-3)
3. **`publish-eslint-config`** (I-6) and the **`supabase/functions` typecheck path** (I-7)
4. **Pending-encryption positive control** (I-5)
5. **Seed the vault secret for `document-retention-sweep-daily`** (N-3) — **operator**
6. **Unlink / guard the Supabase CLI project ref** (S-7) — add a pre-push assertion, do not merely unlink
7. **Three preventative migration gates:** global version uniqueness · applier **fails closed** on zero expected files · post-apply object verification
8. **Zero-consumer CI gate** — would have caught 5 of the 10 unbuilt asks before they were called done. **Highest-leverage single gate available**
9. **Closure-scope gate** (P-1) — assert a closing comment enumerates every acceptance criterion

### Lane 1 — Security & correctness

1. Supervisor cross-host selector (S-6)
2. `r7_jobs` cross-tenant limb (S-3) — reconcile against §4.2
3. **Candidate consent enforcement (Z-2)** — a consent obligation, not tidiness
4. Seat counting onto `user_tenants`, tenant-wide (S-5 / N-2)
5. `browse.tenant_encryption_keys` `security_invoker` tripwire (N-1)

### Lane 2 — Repeatedly requested *(oldest debt; sequenced by his own count)*

1. **Client SMTP / Google / Azure email** — finish the vault contract, do not patch around it
2. **Permissions default-checked** — raised three times (D-51, D-97, D-103)
3. **dnd-kit card independence** — file the **estate-wide** issue; fix as a class, not a page
4. **Airtable-style data view** — and close `crm7#1477`
5. **RAMS funding matrix** — 112 days past a ratified ADR
6. **R8 allowances + MA000036 trade selector** — regressions
7. **Commercial construction sector** — money path

### Lane 3 — Architecture *(strictly serial: T → C → S)*

1. **T** — Border/elevation token system. Surface elevation scale; borders at one level; accent reserved for interactive state; **`:focus-visible` for throughput and R80.4** (U-7); per-app accent adoption (Z-3)
2. **C** — Reporting consolidation ADR → two surfaces. **Unblocked by §4.3**
3. **S** — Remaining schema builder: relationship display controls (scoping edges hidden by default); manuals with signed-off screenshots

### Lane 4 — Roles, caseload, personas

1. `team_invitations` role CHECK + the `owner` asymmetry
2. `field_manager` into `tenant_invitations.portal_role`
3. **Decide:** roles as fixed enum extended by migration, **or** roles-as-data via `role_capabilities` (Z-1)
4. Caseload assignment UI — apprentices **and** host employers
5. Manager view grouped by field officer
6. **Field officer mobile portal** — settle 390px vs 360px; it matters most here
7. Candidate identity: join the tenancy model as `guest`, or stay separate **and document why**
8. **School relation for school-based apprentices** — modelling gap, not wiring
9. Self-managed-enterprise entitlement via `tenant_features`
10. Terminology: apprentices / trainees / workers

---

## 6. Open decisions — operator only

| # | Decision | Cost of delay |
|---|---|---|
| **B-1** | *Superseded — ruled 2026-08-25: **a report is a read-only saved question** (§4.3). Confirm acceptance* | Was gating ~15,500 LOC / 17 requirements for 12 days |
| **B-2** | **Fairwork key** — absent from the repo and all 7 environments | Entire compliance lane parked. **No authority conjures a secret** |
| **B-3** | **Vault secret for `document-retention-sweep-daily`** (N-3) | A compliance obligation currently unmet |
| **D-1** | **Commit signing** — enforce, or accept silent Vercel cancellations | Every gate result suspect |
| **D-3** | **Roles: enum-by-migration or data-driven** (Z-1 informs this — 1,404 rows, one reader) | Blocks custom user types in the UI |
| **D-4** | **Candidates: inside the tenancy model or separate** | Conduit continues to feel like a separate product |
| **D-5** | **390px vs 360px** | Two standards conflict; bites hardest on the field officer's phone |
| **D-6** | **Gmail scopes** — `gmail.send` only (no CASA) vs `gmail.modify` (annual paid assessment). Schema implies inbound sync, so likely already committed — confirm it was deliberate | Blocks the email lane's shape |
| **D-7** | **Sydney Supabase project** — abandoned, or a planned data-residency move? Empty, ACTIVE_HEALTHY, and the local CLI points at it (S-7) | A `db push` silently targets the wrong project |

*`D-2` (lane marker) is `[AGENT-ENV]` — the observation is P-4 here, the decision belongs in the agent-environment register.*

---

## 7. How to read a "green" gate here

Until Lane 0 items 1–4 land, treat every green check as **unproven**:

- **Commits are unsigned** → Vercel may have cancelled the deploy → the gate inspected a **stale build**
- **Three gates confirmed passing because they never ran** (I-6, I-7, and the historical I-4 class)
- **The applier reported success having never read the file**
- **crm7 is a PWA whose service worker serves the Supabase reads** — Playwright interception silently does nothing without `serviceWorkers: 'block'`; one pass confidently reported 44 nodes in an "empty" state
- **Visual verdicts banked this month may cite different protocol copies** — `[AGENT-ENV]` AE-2

---

## 8. Provenance

**Cowork dispatch (15 lanes):** verify machine access · find running agent sessions · clear orphaned IDE locks · test agent control channel · read ship skills · audit stranded branch work *(coordinator)* · schema-builder UX spec · estate-wide theme spec · reporting consolidation · unified execution backlog · fix schema-builder P0s · fix live security holes · Lane 0 instruments · field-officer roles · break publish circularity

**Scheduled:** `bsuite-agent-drive`, every 30 min, PI authority — **currently disabled for consolidation**

**CLI agents:** 7 discovered where ~4 were expected. Details are `[AGENT-ENV]`.

---

*Compiled and verified 2026-08-25. Uncommitted, for Braden's review. Re-measure every number before acting.*
