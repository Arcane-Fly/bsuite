# Phase 0 — scope remediation, delivery and evidence record

**Document:** `docs/20260814-phase0-scope-remediation-delivery-v1.00W.md`
**Date:** 2026-08-14 · **Version:** 1.00W · **Status:** W — Working
**Programme:** [`plans/20260814-portals-and-surface-class-remediation-v1.00D.md`](plans/20260814-portals-and-surface-class-remediation-v1.00D.md) Phase 0
**Delivered by:** `operator-proxy-claude` (Cowork), isolated clones under `/tmp/portals-lane`
**PRs:** [crm7#1731](https://github.com/GaryOcean428/crm7/pull/1731) · [business-suite-unified#726](https://github.com/GaryOcean428/business-suite-unified/pull/726)

> Written per §5 of [`20260227-contributing-standards-guide-v1.01W.md`](20260227-contributing-standards-guide-v1.01W.md)
> (documentation naming and status codes) and §9 of the universal agent instructions
> (FF-SELF-VALIDATION-20260507 — evidence rows, not claims).

---

## 1. Why this document exists

Phase 0 set out to close four items filed as P0. **Two of them were wrong**, and one of the two
would have taken a production surface down. The corrections matter more than the fixes, because
the same reasoning error is cheap to repeat — so it is recorded here rather than only in issue
comments that scroll away.

The operator's standing instruction, D-85: *"If an item in this directive is already fixed and I
missed it, say so and link the evidence — I would rather be corrected than have work repeated."*
This document is the other direction of the same rule.

---

## 2. What was retracted, and why

### 2.1 crm7#1728 — `report_templates_select` — **retracted; the filed fix would have caused an outage**

**Filed as:** the read policy's platform limb is unconditional (`USING (scope = 'platform') OR …`)
while all three write policies carry `AND is_platform_developer()`. Classified RC6 — write path
hardened, read path left behind.

**Measured before writing the migration.** All 23 platform-scope rows are `is_system = true`,
`tenant_id IS NULL`, `user_id IS NULL`, and are the **shared GTO standard report catalogue**:

> Apprentice Progress Report · Apprentice Register · AVETMISS Statistical Summary · Billable Hours
> Report · Charge-Out Rate Summary · CoInvest LSL Report · Consultant KPI Dashboard · Financial
> Summary · Funding Claims Report · GTO National Standards Audit Pack · Host Employer Monthly Pack
> · Host Employer Register · Hours by Work Type · Invoicing + Reconciliation · Monitoring Visits
> (90-Day Rule) · Pay Item Group Hours · Pay Items by Employee · Payroll Liability Report ·
> Rejected Timesheets · Timesheet Summary · Training Plan Progress (AQF Units) · Training Plan
> Status · WHS Incident Log

Every tenant is **meant** to read them. Adding `AND is_platform_developer()` — the fix as filed —
would have removed the entire standard report set from every tenant in production.

**What D-66 actually complained about** was a FutureBuild admin able to choose "Platform-wide"
*scope* in the `/reports/custom/create` wizard, i.e. **authoring** at platform scope. Closed on
2026-08-05 on both sides: `create.tsx` gates on `usePlatformRole().isDeveloper`, and
`20260805153000_report_templates_platform_scope_hardening.sql` closed the `is_system` side-channel
on INSERT/UPDATE/DELETE.

**What genuinely remained:** the platform limb carried no `is_system` qualifier. Adding it changes
nothing today and closes the shape. Shipped in crm7#1731 §5 with an explicit output-equivalence
requirement — *an ordinary tenant user must still read exactly 23 rows.*

### 2.2 crm7#1729 — `contacts` host-employer limb — **retracted; the original fix chose the right layer**

**Filed as:** D-65 was fixed at query scope over a permissive policy, leaving PostgREST open.

**`contacts` has no host-employer foreign key.** The link is a three-limb join, documented in
`src/lib/hostContacts.ts`:

```
contacts for a host employer =
    contacts whose client_id is one of that employer's `clients` rows
 OR contacts whose organisation_id is that employer
 OR the employer's own employers.primary_contact_id
```

RLS answers one question — *may this user read this row?* A GTO staff member legitimately reads
contacts across every host employer in their tenant; that is their job, and tenant RLS already
enforces the boundary that matters (verified 2026-08-13: tenant A saw 5 of 79 estate-wide
contacts, tenant B its own 5). The exposure the operator reported was **contextual** — *"while
editing a placement whose host is LogisticsPro NSW"* — and there is no current-host in the
session, so no policy predicate can express it.

The query-scope fix is fail-closed by construction, extracted once so a third hand-rolled copy
could not be written, and covered by two test files. **crm7#1675 stays closed; it was correct.**

**The real limb is future work.** When the host portal ships under D-93/D-95, a **host-role** user
will hold a session and *does* have a stable scope — so that limb must be RLS, not a query filter,
because a host portal user is untrusted in a way a GTO staff member is not. Tracked as a portal
prerequisite.

### 2.3 The rule this produced

Added to `bsuite-rls-authz-red-team` **RC5**:

> The class only applies when the policy **could** carry the limb and doesn't. Ask who the
> **subject** is before calling a missing predicate a defect.

---

## 3. What the class sweep found instead — crm7#1730

Rather than inspecting the tables someone had complained about, the whole schema was queried for
the shape: **every table where no SELECT policy carries a scope predicate while a write policy
does.**

**12 matched. 7 are correct as they stand** — owner-less reference data legitimately readable by
every authenticated user (`apprenticeship_titles` 369 rows, `qualification_units` 119,
`document_merge_fields` 53, `state_training_authorities` 8, `classifications`, `hiring_divisions`,
both public-holiday tables) — plus `platform_branding`, deliberately anon-readable so branding
renders before login.

**5 carry an owner column. 4 are real:**

| Table | SELECT was | Rows | Why it matters |
|---|---|---|---|
| `system_notices` | `USING (true)` | 1 | Its own writes enforce `scope` precisely; the read enforced nothing, so any tenant read any other tenant's `scope='tenant'` notice |
| `tenant_app_branding` | `USING (true)` for `authenticated` **and** `anon` | 0 | Tier-2 `tenant_branding` was locked on 2026-08-13 and carries no anon policy at all. Tier 2 shut, tier 3 open to anonymous — an unauthenticated tenant-enumeration vector |
| `apprentice_handoff_tokens` | `expires_at > now() AND redeemed_at IS NULL` | 0 | No tenant predicate over `candidate_snapshot`. Becomes a cross-tenant PII read **and** a live-token enumeration the moment the conduit→crm7 handoff ships |
| `apprentice_profiles` | `auth.uid() IS NOT NULL` | 0 | All three writes are `auth.uid() = user_id`; the read was "anyone with a login", over `base_pay_rate` and `cost_config` |

**`system_notices` and `tenant_app_branding` appear in neither the operator's notes nor the
2026-08-13 directive.** They exist only because the sweep was run instead of the spot-check.

### 3.1 The sibling selectors

`HostSiteSelector` and `HostAgreementSelector` had no required host scope, so a picker rendered in
a host context silently offered every host's rows in the tenant — the D-65 shape in two surfaces
nobody had looked at. `sites` and `host_agreements` are tenant-scoped by RLS, so this is the
level-in leak, not a cross-tenant one.

`hostScope` is now a **required discriminated union** that fails closed while an id is unresolved,
mirroring `buildHostContactFilter`. Required rather than optional because the failure mode is a
caller *forgetting*, and the only way to stop that is to make forgetting unrepresentable.

`HostSiteSelector` had **zero live call sites**. `HostAgreementSelector`'s single call site,
`EngagementFormFields.tsx`, declares `'tenant-wide'` explicitly because that form has no host
employer field at all — whether an engagement carries a host is a data-model question, raised on
crm7#1730 rather than invented in a selector.

---

## 4. business-suite-unified — the last two holders of a wider rule

`canUsePlatformKit()` and the `platform-kit-proxy` edge function both accepted
`platform_admin OR developer OR is_super_admin`, gating 22 Developer Portal surfaces. **Both are
narrowed in BSU#726**, so the file's own "no stricter, no looser" contract still holds.
`platform_admin` is kept, matching what `20260816020000_d66_platform_scope_visibility_lockdown.sql`
kept for `platform_settings_changes`.

**The database had already moved** — that migration is applied and live; verified zero SELECT
policies on those eight tables still reference `is_super_admin`. The two gates were the last
holders, which left the UI *looser* than the data behind it: a page that renders and then 403s on
every call.

Two tests flip from positive to negative with the reasoning inline, each paired with a new
positive control proving a developer who also carries the flag keeps access.

**Deploy ordering:** the proxy change needs an edge-function redeploy. Until then the client is
narrow and the server wide — the safe direction, but a fact the merger needs.

---

## 5. Evidence

| Check | crm7 | business-suite-unified |
|---|---|---|
| Full test suite | **520 files, 6824 passed, 73 skipped, exit 0** | **104 files, 1067 passed, exit 0** |
| Typecheck | clean | exit 0 |
| Lint | `[lint-ratchet] PASS: 0 errors = baseline 0` | `eslint . --max-warnings 0` exit 0 |
| Migration linters | `lint:migrations-revoke-anon` OK · `lint:migrations-secdef-search-path` OK | n/a |
| Targeted new tests | `hostScopeFailClosed.test.tsx` — 6 passed | `platformRole` + `DeveloperPortalGate` — 13 passed |

**Baselines** were read live from `pg_policies` before any file was written and are transcribed
verbatim into the migration header, with post-apply positive **and** negative controls specified
at its foot. The migration is **written, not applied** — it applies from parent `main` via the
Supabase Migrations workflow.

**Flake note, recorded so it is not rediscovered.** A first BSU full-suite run showed 2 failures,
`production-shell.smoke.test.tsx` and `TenantSettings.test.tsx`, both `Test timed out in 5000ms`.
Both pass in isolation on the branch (1015 ms and 390 ms) **and** on clean `development`, and the
full suite is green when run alone. The first run was concurrent with crm7's 520-file suite on the
same machine. Load-induced timeout flake, not a regression — the class is already documented in
`bsuite-shared-ui-rollouts`.

---

## 6. Operator ruling absorbed mid-phase — Caris

Operator, 2026-08-14: *"caris should be the super admin for future builds enterprise"*, noting he
has said so **innumerable times**. The repetition is itself the finding: agents keep reading her
profile row and filing it as an anomaly, because they read `is_super_admin` as a platform-tier
flag. It is not one.

This document's earlier draft, and the BSU#726 PR body, made exactly that error. Both are
corrected. Recorded as memory `bsuite_ruling_20260814_caris_is_futurebuild_super_admin` and filed
as **business-suite-unified#727**.

| `caris@mbawa.com` | Now | Should be |
|---|---|---|
| `is_super_admin` | `false` | **`true`** |
| `platform_role` | `tester` | not a platform-tier role — clear it |

**The ruling strengthens the D-66 narrowing rather than undermining it.** Caris is the concrete
case it protects against: under the old predicate, flagging her would have handed her secrets,
storage, the database console and the all-tenant list.

**But the flag cannot simply be set.** `is_super_admin` currently means nothing — removed from
nine SELECT policies by the D-66 lockdown and from the last two gates by BSU#726 — because **T1b
part 2, the tenant-tree cascade that gives it its narrower meaning, was never built.** Build the
cascade, then set the flags. Setting the flag first is decorative; widening a gate to make it
"work" is the exact defect D-66 forbids.

---

## 7. Open items carried out of Phase 0

| Item | Owner | Where |
|---|---|---|
| Wire the sweep query into CI so a new table cannot join the list silently | crm7 | crm7#1730 |
| Edge-function redeploy for `platform-kit-proxy` | BSU | BSU#726 |
| T1b part 2 — the super-admin tenant-tree cascade, then Caris's flags | BSU | BSU#727 |
| Host-role RLS limb on `contacts` | crm7 | portal prerequisite, D-93/D-95 |
| Whether an engagement carries a host employer | crm7 | crm7#1730 |

---

## 8. Related documents

- [`20260814-notes-backlog-verification-register-v1.00F.md`](20260814-notes-backlog-verification-register-v1.00F.md) — the measured state of every defect in the operator's notes
- [`20260814-portals-operator-rulings-v1.00A.md`](20260814-portals-operator-rulings-v1.00A.md) — D-93 to D-98
- [`20260813-operator-directive-notes-backlog-remediation-v1.00D.md`](20260813-operator-directive-notes-backlog-remediation-v1.00D.md) — D-59 to D-92
- [`plans/20260814-portals-and-surface-class-remediation-v1.00D.md`](plans/20260814-portals-and-surface-class-remediation-v1.00D.md) — the seven-phase programme
