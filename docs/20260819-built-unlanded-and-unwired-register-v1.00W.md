# Built but unlanded, built but unwired — a machine sweep

> **THIS REGISTER FORKED. Read `20260817-built-unlanded-and-unwired-register-v1.00W.md` too.**
>
> Two files carry this same slug and NEITHER is a superset. Discovered 2026-08-26.
> Despite the later date in this filename, the 08-17 file is the one that kept being updated —
> it carries §9.10 and §9.11 (the 20 August entries), which this file does not.
>
> **Already ported OUT of this file into 08-17:** §3.3, §4.4, §4.5 and the NX-7 correction.
>
> **Still unique to this file:** its §9 is a different pass, carrying BU-9's closure, the
> "there is no such cron job" reversal, and the `awards` 156-row ingestion finding. Those have
> NOT been merged, because reconciling two divergent §9 sections is an editorial judgement and
> half-merging drops corrections silently.
>
> **Not frozen, precisely because it still holds content 08-17 lacks.** Freezing it would bury
> live corrections behind a status marker, which is worse than the fork.

**Document:** `docs/20260817-built-unlanded-and-unwired-register-v1.00W.md`
**Date:** 2026-08-17, §9 added 2026-08-19, §3.3/§4.4 resolution added 2026-08-19 · **Version:** 1.02W
· **Status:** W — Working
**Scope:** every git work tree on this laptop, every source module and edge function in the six apps,
and (from 2026-08-19, §9) the operator's running notes file `bsuite notes.docx`
**Feeds:** `docs/plans/20260817-estate-completion-plan-v1.00D.md` (bsuite#2081) and
`docs/20260817-estate-remaining-work-register-v3.00W.md` (bsuite#2075)

The v3 register and the completion plan both count what is *missing*. Neither counts what already
**exists and is not reachable** — work that was built and then stopped short of landing, or landed
and was never connected to anything. This sweep counts that.

---

## 0. Method, so the negatives can be trusted

A finding of "nothing here" is only worth reading if the search was real. What ran:

| Question | How it was answered |
|---|---|
| Is any commit stranded on this machine? | Enumerated every `.git` under `Desktop/Dev`, `~/bsuite`, `~/repoman`, `~/StudioProjects`, `~/copilot-worktrees`, `~/.windsurf/worktrees`, deduplicated by `git-common-dir`, expanded each to its full `git worktree list` — **60 repositories, 96 work trees**. For every work tree: `git rev-list --count origin/<branch>..HEAD` (unpushed) *and* `HEAD..origin/<branch>` (behind), because "local sha ≠ remote sha" alone does not say which direction. |
| Is any work uncommitted? | `git status --porcelain` + `git diff --stat HEAD` per work tree. |
| Is any built work unlanded? | `gh pr list --state open` across all seven estate repositories. |
| Is any module unreachable? | For every tracked `src/**` and `app/**` `.ts`/`.tsx` (excluding tests, mocks, e2e, and the six ambiguous stems `index`/`main`/`page`/`layout`/`route`/`App`): `git grep -l` for the filename stem across the whole repository, excluding the file itself. Zero hits ⇒ candidate. |
| Are the candidates really unreachable? | Twelve highest-value candidates re-checked adversarially: every exported symbol searched with `git grep -w`, plus the extension-less path (to catch `import()` and lazy routes), across **all** tracked files including config, SQL, and docs. |
| Is any edge function unreachable? | Cross-referenced every `supabase/functions/*/index.ts` against (a) `functions.invoke('name')` and `/functions/v1/name` in all six apps, (b) the **live** `cron.job` table on `tuybltdrdefjblnplpqo`, (c) the vault secret names the cron commands dereference. |

**What this method cannot see, stated up front:** a module reached only by a string built at runtime;
an edge function called by an external party (a webhook) or by a workflow in a repository outside the
estate; a cron job in a different Postgres database. Each finding below says which of these apply to it.

---

## 1. The headline is a negative: **no commit is stranded on this machine**

Across 96 work trees, **zero** have commits that exist locally and nowhere else.

This is worth stating precisely because it is easy to get wrong. Ten branches show a local SHA that
differs from their remote, which reads like unpushed work. All ten are **behind** their remote, not
ahead — between 8 and 29 commits behind — because the branch was pushed, the PR was merged, and the
local work tree was never updated. Direction was checked in both senses for every one:

| Work tree | Branch | local-ahead | local-behind |
|---|---|---|---|
| `worktrees/bsuite-controls` | `lane/v4-cron-health-audit` | 0 | 26 |
| `worktrees/bsuite-fonts` | `feat/theme-font-faces` | 0 | 26 |
| `worktrees/bsuite-postgrest-guard-registry` | `chore/register-postgrest-column-guard` | 0 | 19 |
| `worktrees/bsuite-th5-th6` | `fix/th5-th6-interactive-border-gradient-underline` | 0 | 21 |
| `worktrees/open-adr-truth` | `fix/open-adr-truth` | 0 | 8 |
| `worktrees/v7-hook-ratchet` | `chore/v7-hook-suppression-ratchet` | 0 | 29 |
| `worktrees/crm7-e2e-selectors-and-urls` | `fix/e2e-selectors-and-urls` | 0 | 19 |
| `worktrees/crm7-module-visibility` | `fix/d80-module-visibility-hidden-modules` | 0 | 13 |
| `worktrees/crm7-pf3-pf4b` | `fix/pf3-pf4b-provable-redundancies` | 0 | 13 |
| `worktrees/crm7-po1-fo-landing` | `fix/po1-field-officer-landing-queries` | 0 | 13 |

Nine further bsuite branches are **local-only names with no upstream** — `audit/au-tax-invoice-rcti-gst-abn-20260817`,
`audit/contractor-sham-20260817`, `audit/wc-privacy-20260817`, `fix/open-ad-adoption`, `fix/open-po-portal`,
`fix/open-th-pf`, `fix/gto-report-wc-from-live-table`, `fix/payday-super-due-date-display`,
`fix/termination-screen-honest-state`. Every one points at a commit that is already an ancestor of
`origin/development`. They are empty labels, not lost work, and deleting them loses nothing.

**Nothing in §1 requires action.** It is here so that the next person who sees 96 work trees and 32
branches does not spend a morning re-deriving it.

---

## 2. Built and unlanded — 18 open pull requests

All 18 were opened on 2026-08-17. Fourteen are in crm7 and four in the parent; BSU, conduit, R80.4,
throughput and braden have **none**.

### crm7 — 14 open

| PR | Mergeable | Title |
|---|---|---|
| #1797 | yes | the Company picker hid 91 % of clients behind an inner join |
| #1796 | yes | unblock the e2e suite — a strict-mode landmine and an unpublished a11y fix |
| #1795 | yes | AD-2 — adopt shared `@bsuite/page-builder/scanner` for ungridded-multi-card |
| #1794 | yes | annual leave override — closes the 4-week hardcode that **under-billed hosts** |
| #1793 | yes | kill the fake termination save/total; wire the real transition path |
| #1792 | yes | stop showing the retired quarterly super due date |
| #1791 | yes | GTO charge-out rate summary reads the live snapshot table, not a dead one |
| #1789 | yes | TH-9 — collapse non-responsive `grid-cols-2` to `grid-cols-1` on mobile |
| #1788 | unknown | PO-2 — RLS scoping for `host_supervisor` on people/placements |
| #1787 | yes | take the font faces from `@bsuite/theme` instead of hand-writing them |
| #1783 | unknown | field officer landing page resolved nothing; add a guard for the class |
| #1780 | unknown | drop the 4 PF-3/PF-4b objects that are provably redundant |
| #1776 | unknown | three launch flags were counted as hidden and rendered nowhere (D-80) |
| #1774 | unknown | stop rendering invented budgets and milestones (K-1, K-4) |

### bsuite parent — 4 open

| PR | Mergeable | Title |
|---|---|---|
| #2085 | yes | the rehearsal positive control could pass while its own self-test failed |
| #2084 | yes | the colour-ban probe never ran, and its own control certified it |
| #2065 | unknown | honour closing keywords on development merges (register V-10) |
| #2062 | unknown | the colour ban's reach and the recovered-doc trap were both unmeasured |

**Why this belongs in a completion register.** Four of these are not queue items — they are the
completion plan's own phases, already written:

- **#1774** *is* Phase 1. It removes invented budgets and milestones — the fabricated-data class the
  plan's `<DataState>` work exists to close. Merging it shrinks Phase 1's site count before Phase 1 starts.
- **#1794** and **#1791** are Phase 5. One closes a four-week hardcode that under-billed hosts; the other
  points a GTO rate summary at the live snapshot table instead of a dead one.
- **#1788** is Phase 4 and contract C-1 — RLS scoping for `host_supervisor`, which is ruling D-95
  (a host must not see the available worker pool) enforced where the plan says it must be.

Per D-85 these are **open with an owner and a date**, not addressed. The plan's phase counts should be
re-derived after they merge, not before, or Phase 1 will be scoped against work that no longer exists.

---

## 3. Built and unwired — 64 modules that nothing imports

Per app, after excluding tests, mocks, e2e and the six ambiguous stems:

| App | Unreferenced | Vendored UI primitives (shadcn / magicui) never used | Feature code |
|---|---|---|---|
| braden | 35 | 18 | **17** |
| crm7 | 13 | 6 | **7** |
| business-suite-unified | 11 | 10 | **1** |
| throughput | 4 | 1 | **3** |
| conduit | 1 | 0 | **1** |
| R80.4 | **0** | 0 | 0 |
| **total** | **64** | **35** | **29** |

R80.4 having zero is a real result, not a gap in the scan — the same scan over the same file globs
found 35 in braden.

### 3.1 The feature code, by app

**braden — an entire admin surface, ~1,800 lines, unreachable.** This is the largest single finding.

| Module | Lines |
|---|---|
| `src/components/admin/editor/DndLayoutEditor.tsx` | 884 |
| `src/components/media/useMediaManager.ts` | 259 |
| `src/components/admin/AdminLayout.tsx` | 174 |
| `src/lib/blob-storage.ts` | 165 |
| `src/components/media/MediaUploader.tsx` | 124 |
| `src/components/admin/StoragePolicyAudit.tsx` | 114 |
| `src/lib/schemaBuilderService.ts` | 85 |
| `src/components/media/MediaGallery.tsx` | 68 |
| `src/components/admin/SiteEditor/{Clients,Emails,Leads,Staff}Card.tsx` | 67 each |
| `src/components/Projects.tsx` | 48 |
| `src/hooks/useBannerOffset.ts` | 42 |
| `src/lib/email/emailService.ts` | 41 |
| `src/components/theme/ThemeToggle.tsx` | 24 |

A drag-and-drop layout editor, a media manager, a storage-policy auditor, four site-editor cards and
an admin shell to hold them. Four of these were adversarially re-checked (`DndLayoutEditor`,
`AdminLayout`, `useMediaManager`, `LeadsCard`) and every one returned **zero** references of any
kind — no symbol, no path, no lazy import, no mention in config, SQL or docs.

**crm7 — 7 modules, 1,563 lines**

| Module | Lines | Note |
|---|---|---|
| `src/components/financial/report-form-dialog.tsx` | 414 | referenced *only* by `eslint.config.js` |
| `src/components/invoices/InvoiceLineItemBuilder.tsx` | 374 | referenced *only* by `eslint.config.js` and a migration comment |
| `src/services/wageSnapshotService.ts` | 272 | referenced *only* by a plan document from 2026-04-23 |
| `src/lib/smsAdapter.ts` | 182 | zero references of any kind |
| `src/components/fair-work/FairWorkUpdateNotification.tsx` | 160 | referenced only by `MIGRATION_SUMMARY.md` |
| `src/lib/fairwork/configSchema.ts` | 111 | |
| `src/components/auth/permission-guard.tsx` | 50 | **a permission guard that guards nothing** |

**business-suite-unified** — `src/lib/notificationService.ts`, **460 lines**, zero references.

**throughput** — `src/lib/user-management.ts` (552), `src/lib/agents/baseAgent.ts` (162),
`src/hooks/useTodos.ts` (182).

**conduit** — `src/components/auth/AuthShell.tsx` (62).

### 3.2 Three modules are kept alive by a lint exemption

This is the part worth acting on first, because it inverts the usual signal. Somebody wrote a
**per-file rule suppression** for a file that nothing renders:

- `crm7/eslint.config.js:170` lists `src/components/invoices/InvoiceLineItemBuilder.tsx` in the
  `setCoverage(null)` exemption list.
- `crm7/eslint.config.js:281` lists `src/components/financial/report-form-dialog.tsx` in
  `INCOMPATIBLE_LIBRARY_FILES`.
- `throughput/eslint.config.js:44` turns **`bsuite/no-cross-app-write` off** for
  `src/lib/user-management.ts`.

The third is not merely dead code. It is 552 lines that write across app boundaries, with the guard
that forbids that **explicitly disabled**, imported by nothing. Today it is inert. The day someone
wires it up, it ships with its safety rail already removed and no PR will show the removal, because
the removal happened months earlier in a file nobody reads during a feature review.

**The class, not the file:** a lint exemption should not be able to outlive its subject's last import.
The durable fix is a guard that fails when `eslint.config.js` names a path that no tracked file
imports — one script, and it retires all three of these plus any future instance. **Not built by
this resolution pass** (out of scope for a per-item verdict sweep; flagged for a follow-up PR).

### 3.3 Resolution — 2026-08-19

Every one of the 29 feature-code rows above (§3.1, including the 3 named again in §3.2) got exactly
one of the three verdicts the operator's ledger requires. Evidence for each is the whole-estate
`git grep -w` on every exported symbol plus the extension-less path, and (where a live counterpart
was suspected) reading that counterpart's actual imports — not re-running the original stem scan.
Register corrections are called out inline; **braden's count is 16 files, not 17** — the summary
table in §3 could not be reconciled to a 17th file by name and is treated as an off-by-one in the
original count, not a hidden finding.

| App | Module | Verdict | Evidence |
|---|---|---|---|
| braden | `DndLayoutEditor.tsx` | REMOVE IT (ask) | Live equivalent: `SiteEditorLayout` → `ComponentsTab` → `ComponentLibrary.tsx`. Predates/superseded by the "Admin Portal Moved" consolidation onto the BSU Developer Portal (`#426`, 2026-08-19) |
| braden | `useMediaManager.ts` | REMOVE IT (ask) | Live equivalent: `MediaLibrary.tsx` via `MediaTab.tsx` |
| braden | `AdminLayout.tsx` | REMOVE IT (ask) | No route mounts it; `/admin/*` now resolves to `PortalMoved` except `branding`/`page-builder`/`marketing` (`Routes.tsx`) |
| braden | `blob-storage.ts` | **KEEP, MARKED UNRELEASED** | Real `@vercel/blob` client, dependency installed for it, live media path still Supabase Storage. Header added |
| braden | `MediaUploader.tsx` | REMOVE IT (ask) | Same cluster as `useMediaManager.ts` |
| braden | `StoragePolicyAudit.tsx` | REMOVE IT (ask) | Real, working RLS-audit tool — no live route mounts it, and adding a new braden admin route would contradict the Admin-Portal-Moved consolidation. Worth re-implementing in the BSU Developer Portal, not braden |
| braden | `schemaBuilderService.ts` | REMOVE IT (ask) | Zero importers even post-`@bsuite/schema-registry` consolidation (braden's own `docs/20260723-...`); braden does not ship the dynamic-entity feature this exists for |
| braden | `MediaGallery.tsx` | REMOVE IT (ask) | Same cluster as `useMediaManager.ts` |
| braden | `ClientsCard.tsx`/`EmailsCard.tsx`/`LeadsCard.tsx`/`StaffCard.tsx` | REMOVE IT (ask), all 4 | `src/pages/admin/{Clients,Emails,Leads,Staff}.tsx` are the live equivalents, using `@/services/adminCrudService` directly — do not import these Card components |
| braden | `Projects.tsx` | REMOVE IT (ask) | Duplicate of the live `Services.tsx` — same `id="work"`/"Our Services" content, not rendered on `Index.tsx` |
| braden | `useBannerOffset.ts` | **KEEP, MARKED UNRELEASED** | Correct ResizeObserver hook; `CookieConsent.tsx` solves an adjacent problem with a hardcoded `140px` on a *different* CSS var (`--cookie-banner-h`, not `--banner-offset`) — suggestive, not confirmed as the intended target. Header added |
| braden | `emailService.ts` | REMOVE IT (ask) | Self-documented mock ("Mock implementation..."); live confirmation email flow is `lead-capture` (cross-app, sourced from **crm7**) → `email-dispatcher`, server-side |
| braden | `ThemeToggle.tsx` | **WIRE IT — done** | Dark mode live app-wide (`ThemeProvider`), no manual toggle existed. Added to desktop nav header. PR [`braden#432`](https://github.com/GaryOcean428/braden/pull/432) |
| crm7 | `report-form-dialog.tsx` | REMOVE IT (ask) | `/financial/reports/*` explicitly retired 2026-08-13, operator directive **D-79** (crm7#1568/#1656, documented in `App.tsx:433`) — this dialog is the one piece of that retirement nobody deleted |
| crm7 | `InvoiceLineItemBuilder.tsx` | REMOVE IT (ask) | Superseded: live `invoice-form-dialog.tsx` uses `generateInvoiceFromTimesheets` (`@/lib/billingEngine`), an automated generator, not this manual UI builder |
| crm7 | `wageSnapshotService.ts` | **KEEP, MARKED UNRELEASED** (pre-existing) | Register NX-7's own worked example — already marked on `development` as of this sweep. Confirmed present, no change needed |
| crm7 | `smsAdapter.ts` | REMOVE IT (ask) | "OTS Parity — Phase 8" infra; its sibling `communicationSender.ts` (same phase) was already removed as SAFE_DELETE in `bbd04af3` (2026-07-25 dead-code audit) — this one was missed by that sweep, not spared by it |
| crm7 | `FairWorkUpdateNotification.tsx` | **WIRE IT — done** | Null-safe award-update banner; data source (`fetchAwardUpdates` → `fairwork-enhanced`) confirmed live (NX-8: 6 crm7 callers). Mounted on `/payroll/award-rates` as its own `CanvasCard`. PR [`crm7#1861`](https://github.com/GaryOcean428/crm7/pull/1861) |
| crm7 | `configSchema.ts` | **KEEP, MARKED UNRELEASED** | Complete Zod validation ported for `fairworkEnhancedService`'s config; wiring it means retrofitting a 1,400+ line, 6-caller live service — out of scope for this sweep. Header added |
| crm7 | `permission-guard.tsx` | REMOVE IT (ask) | Self-documented `@deprecated` — "Use `PermissionGate` instead", which is confirmed live (imported by `award-rates/index.tsx` among others) |
| business-suite-unified | `notificationService.ts` | REMOVE IT (ask) | Both halves superseded: inbound (in-app bell) is `notificationStore.ts` (`app_notifications` table, live `NotificationCenter.tsx`); outbound (`send-notification` edge fn) is called directly from `stripe-webhook/index.ts`, bypassing this wrapper entirely |
| throughput | `user-management.ts` | REMOVE IT (ask) | Superseded: live `TeamManagement.tsx` + `teams`/`team_workspaces` tables. **Also carries §3.2's disabled `bsuite/no-cross-app-write` guard on `profiles`/`team_members`/`team_invitations` writes — highest-priority item in this whole register to resolve, per the register's own §3.2 framing** |
| throughput | `baseAgent.ts` | **KEEP, MARKED UNRELEASED — done** | Real, current `@langchain/core`/`@langchain/langgraph` deps; built on `LangChainGatewayClient`, which IS live (`useConversation.ts`, `conversationContext.ts`) and correctly routed through the sanctioned AI Gateway proxy. No concrete `BaseAgent` subclass exists yet. PR [`throughput#334`](https://github.com/GaryOcean428/throughput/pull/334) |
| throughput | `useTodos.ts` | REMOVE IT (ask) | Superseded: `lib/db.ts` and `pages/Page.tsx` already call `.from('todos')` inline |
| conduit | `AuthShell.tsx` | **WIRE IT — done** | Built on live design tokens (`--bg-shell*`, `--border-shell` — WCAG-tested elsewhere) and a `magicui` component with no other consumer. Wired into `/auth/login` and `/auth/register`. PR [`conduit#514`](https://github.com/GaryOcean428/conduit/pull/514) |

**The 35 vendored shadcn/magicui UI primitives (per-app counts in the §3 table) are a distinct
class, deliberately not given individual per-file verdicts.** Spot-verified (braden's `magicui/*`
and `ui/drawer.tsx`) as genuinely zero-importer, but shadcn's and magicui's own delivery model is
"copy the component source into the repo whether or not it is used yet" — every app here has a
`src/components/ui/` (shadcn) and, in 4 of 5, a `src/components/magicui/` folder holding more
primitives than any one feature currently consumes. Giving each of the 35 an "UNRELEASED — blocked
on a feature needing this" banner would misdescribe a scaffold as a stalled feature. Recorded here
as **KEEP — vendored design-system primitives, available by design, no gate to mark**; flagged
plainly so the operator can override this call per app if the intent differs from what shadcn's
convention implies. No source files in this class were modified.

**REMOVE IT verdicts above are recommendations only — none were deleted.** Per this task's
constraint, deleting pre-existing work is the operator's call. 20 modules are listed as REMOVE IT
across the 5 apps (13 braden, 4 crm7, 1 business-suite-unified, 2 throughput); asking is this
document's job, not a separate step.

---

## 4. Built and unwired — 9 edge functions with no caller

Cross-referenced against in-app invocations **and** the live `cron.job` table (16 jobs) **and** the
vault secret names those jobs dereference (`jodie_error_scan_url`, `tga_sync_url`, `xero_cron_refresh_url`,
`r7_automation_processor_url`, `r7_talent_pool_matcher_url`, `sta_email_watch_url`).

### 4.1 Unreachable — no app caller, no cron, no plausible external caller

| App | Function | Lines |
|---|---|---|
| crm7 | `refresh-award-rates` | 96 |
| crm7 | `tga-organisation-sync` | 335 |
| crm7 | `encrypt-email-tokens` | 185 |
| business-suite-unified | `process-webhook-queue` | 286 |
| business-suite-unified | `email-token-refresh` | 189 |
| braden | `send-confirmation` | 92 |

### 4.2 The one that matters — **the award-rate refresh chain is inert, and the repo says otherwise**

`crm7/src/__tests__/edge-fn-jwt-verification-contract.test.ts:154` states:

> `refresh-award-rates / sync-award-rates: invoked by pg_cron`

~~**There is no such cron job.**~~ **CORRECTED 2026-08-19 — a cron job now exists, and closing it
proved the deeper claim in this section was still right for a different reason.** Migration
`20260822040000_schedule_sync_award_rates.sql` (renamed from `20260822010000` mid-collision, authored
2026-08-17) scheduled `sync-award-rates-weekly` directly against `sync-award-rates` — **bypassing
`refresh-award-rates` entirely**, which the paragraph above (correctly, at the time) named as the
caller. Live: `cron.job` id **175**, active. It has **never successfully run** — its two vault
secrets, `sync_award_rates_url` and `sync_award_rates_token`, are unseeded, so every weekly fire hits
the migration's own `RAISE EXCEPTION` guard rather than POSTing to a null endpoint.

**Seeding those secrets would not close the gap this section is actually about.** Read the
scheduling migration's own assertion block: *"It populates `award_rate_cache` only —
`award_classifications` remains empty and the vacancy dropdown with it."* `sync-award-rates` writes
`award_rate_cache` and `award_templates` — it **never** writes `award_rates` or
`award_classifications`, which is what `award_rates` **0 rows** / `award_classifications` **0 rows**
(against `awards` **156 rows**) actually means: those two tables have **no ingestion path at all**,
scheduled or not. `refresh-award-rates` is now genuinely orphaned (superseded by the direct cron, not
merely unwired) — see §3.3/§4.4 resolution below for the verdict on both functions. Documented
in-repo on `sync-award-rates/index.ts` so this does not have to be re-derived again.

This is not a tidy-up item. The completion plan's Phase 5 is the calculation engine, and the FWC
Annual Wage Review 2026 became operative on **1 July 2026** — six weeks ago — with a **non-uniform**
C13/C14 structural adjustment that no flat-percentage path can absorb. A refresh function that never
runs cannot make rates stale-detectable, and a comment asserting a scheduler that does not exist is
worse than no comment, because it answers the question "is this wired?" incorrectly for anyone who
greps for it. As of this correction the scheduler exists and the comment is still wrong about what
running it would fix — the same lesson, one layer deeper.

`update-wage-rates` (123 lines) is the benign case in the same family: the repo describes it as
"a deprecated proxy with no authority of its own", which is consistent with having no caller. It
should be deleted rather than explained — recommended REMOVE IT below, not deleted by this sweep
(operator approval required; see resolution section).

### 4.3 Plausibly reached from outside — flagged, not claimed

> **Superseded 2026-08-19 — both were settled, and neither was reached from outside.** The text
> below is kept as written because the *reasoning error* it contains is the finding. See §4.5.

`crm7/adobe-sign-webhook` (320) and `business-suite-unified/jodie-pr-notify` (239) have no in-app
caller and no cron job, which is exactly what a webhook receiver and a CI notifier should look like.
This sweep cannot see Adobe's configuration or a workflow in another repository, so they are recorded
as **unverified**, not as dead. Settling them takes one look at each external configuration.

### 4.5 Both "unverifiable" functions settled — 2026-08-19

The operator read §4.3 and asked why Adobe was a consideration at all. It should not have been, and
the answer took four queries. **Neither function was unverifiable; the sweep simply stopped at the
repository boundary and wrote that boundary up as a property of the world.**

**`crm7/adobe-sign-webhook` — retired 2026-03-17, recovered in error 2026-08-16.**

The retirement is recorded *inside the live database*, in the column comment on
`public.r7_offers.esign_flow_id`: *"In-house @xyflow/react document-flow id (Adobe Sign removed
2026-03-17). Signer completions write the `*_signed_at` columns."* Adobe Sign was replaced by
conduit's own e-sign flow — `src/lib/esign/documentSigner.ts` (196 lines) and
`src/components/esign/SignDocumentFlow.tsx` (333 lines), consumed by
`src/components/offers/OfferProgressDialog.tsx`.

Five months later, bsuite#1955 found the function deployed with no source in any repository,
reconstructed 320 lines of Adobe webhook handling to match the deployed behaviour, hardened it
properly (constant-time client-id comparison, SSRF-safe agreement-id validation, a 256 KB body cap,
migration onto the shared rate limiter) and landed it as a live function. Every one of those steps
was correct work on infrastructure that should not have existed.

| Measured on live, 2026-08-19 | Result |
|---|---|
| `public.document_signatories` | **0 rows** |
| ... with `adobe_participant_id` not null | **0 rows** |
| `public.signature_requests` (the in-house flow) | **5 rows** |
| `document_records.adobe_agreement_id` | **column does not exist on live** |
| Edge invocations, retained log window | **0** |
| Callers in crm7 application code | **0** |

The recovered function queries `document_records.adobe_agreement_id`. That column is absent from
live, so it could not have processed a webhook at any point after the retirement — non-functional
as well as unwanted. Tombstoned to a self-describing 410 Gone in **crm7#1862**; the empty
`adobe_participant_id` column dropped by `20260829030000`. The directory is not deleted — that
needs the operator's go-ahead, and the tombstone is what stops a fourth recovery.

**`business-suite-unified/jodie-pr-notify` — unreached, and its upstream has never produced a row.**

| Measured 2026-08-19 | Result |
|---|---|
| GitHub webhooks on `bsuite`, `business-suite-unified`, `crm7` | **none, on any of the three** |
| `JODIE_WEBHOOK_SECRET` in the project's edge secrets | **not set** |
| `public.jodie_bug_reports` | **0 rows** |

So the function cannot verify a delivery, no delivery is configured, and nothing upstream has ever
needed notifying. This is not a webhook receiver waiting on an external configuration — it is an
unfinished feature whose last mile was never done. Note that `jodie-bug-create` already tells a
reporter *"you will be notified by `jodie-pr-notify` when your PR opens and again when it merges"* —
a promise the platform currently cannot keep. Zero rows means no user has been told it yet.

**The class, and it is the register's own:** *"cannot verify from the repo"* is a statement about
where you looked, not about the system. Both of these were answerable from outside the repo in
minutes — one column comment, one `gh api .../hooks` call, one `supabase secrets list`, one row
count. Recording an unchecked boundary as an inherent unknown is how Adobe stayed a live
consideration for five months after it was retired, and it is the same failure as
[V-3](../.claude/skills/bsuite-ship-visual-promote/SKILL.md): **unevaluable is UNKNOWN only after
you have tried to evaluate it.**

### 4.4 Resolution — 2026-08-19

All 9 edge functions got a verdict — the 6 in §4.1, `update-wage-rates` from §4.2, and the 2 in
§4.3. Three questions were asked of each, per §4.1's own framing: an app caller, a `cron.job` row,
and an external webhook — the third confirmed by reading the function's own auth model (a real
signature/secret check against an external party's credential is evidence *for* the
external-caller theory; the register does not claim to see the far end). `sync-award-rates` is a
10th row below, added for completeness even though the original §4.1 count did not list it — it is
*reachable* (via the callee side of `refresh-award-rates`, and now directly via cron), which is
exactly why it needs the §4.2 correction rather than a WIRE/REMOVE/KEEP-MARKED verdict of its own.

| App | Function | Verdict | Evidence |
|---|---|---|---|
| crm7 | `refresh-award-rates` | REMOVE IT (ask) | Genuinely orphaned as of the 20260822040000 migration — the new cron calls `sync-award-rates` directly, bypassing this wrapper. Its consecutive-failure tracking (`system_settings`) is real functionality the direct-cron approach does not replicate; flagged, not built, since re-routing the cron through it is a migrations-lane call |
| crm7 | `tga-organisation-sync` | Root cause documented, not fixed | Scheduling migration (`20260504031000`) silently NOTICE'd and skipped its `cron.schedule()` because pg_cron/pg_net were not installed when it first ran (2026-04-22); nothing has re-triggered it since both extensions went live. Fix is 2 migrations-lane steps (GUC seeding + re-schedule). Header added to `index.ts` |
| crm7 | `encrypt-email-tokens` | **Special case — not a defect** | Confirmed genuine "service-role-only one-shot migration utility" (register's own test-file comment). Its job (plaintext → vault-encrypted email tokens) is DONE — `ISSUE_VALIDATION_REPORT.md` #454 marked FIXED, columns deprecated, REVOKE applied. Unreachable *by design*, same as a SQL migration file after it applies. Does not map cleanly onto WIRE/REMOVE/KEEP-MARKED-UNRELEASED; recorded as-is, no action |
| business-suite-unified | `process-webhook-queue` | Root cause documented, not fixed | The receiving half (`fairwork-webhook`) is live and enqueues into `mapd_webhook_queue` today; this processor has never run to drain it — corroborated by a since-applied migration dropping `idx_mapd_webhook_queue_status` as unused. Header added |
| business-suite-unified | `email-token-refresh` | Root cause documented, not fixed | `supabase/config.toml` documents it as the intended periodic caller of `oauth-google-email`'s `/refresh` route; nothing schedules it. Header added |
| braden | `send-confirmation` | REMOVE IT (ask) | Superseded: the live contact-form flow calls `lead-capture` (sourced from **crm7**, a cross-app edge-function dependency neither repo declares — worth naming as its own class, not fixed here), which already sends the submitter confirmation via `email-dispatcher` from its service-role context |
| crm7 | `sync-award-rates` | **Reachable (partially) — register corrected** | See §4.2 correction above. Has a live cron caller (job 175) that has never successfully fired (unseeded secrets); even fully working, does not populate `award_rates`/`award_classifications`. Header added documenting all of this in-repo |
| crm7 | `update-wage-rates` | REMOVE IT (ask) | Confirmed deprecated proxy, register's own recommendation stands |
| crm7 | `adobe-sign-webhook` | **RETIRED — settled 2026-08-19, was never UNKNOWN** | Adobe Sign left this estate on **2026-03-17**, replaced by the in-house e-sign flow in conduit. The live DB says so itself, in the column comment on `r7_offers.esign_flow_id`. Tombstoned to a 410 Gone in crm7#1862. See §4.5 |
| business-suite-unified | `jodie-pr-notify` | **UNREACHED — settled 2026-08-19, was never UNKNOWN** | No GitHub webhook exists on any estate repo, and `JODIE_WEBHOOK_SECRET` is not set as an edge secret — so it could not verify a delivery even if one arrived. Its upstream `jodie_bug_reports` holds **0 rows**, so nothing has ever been waiting on it. See §4.5 |

**Pattern across 3 of the 6 §4.1 unreachable functions** (`tga-organisation-sync`,
`process-webhook-queue`, `email-token-refresh`) plus `sync-award-rates`'s partial case: built,
deployed, correctly authored — and never scheduled. None of these are code defects; all four need a
cron-scheduling migration (and in two cases, vault-secret seeding) from the migrations lane, which
this sweep does not own. Documented in-repo on each function so the next reader does not have to
re-derive it.

---

## 5. One hazard found on the way

`Desktop/Dev/worktrees/bsuite-wage-audit` is checked out on **`development`**, is 8 commits behind
`origin/development`, and its index holds **27 changes totalling 3,104 deletions**:

```
D  .github/workflows/cron-job-health-audit.yml          192 lines
D  .github/workflows/hook-suppression-ratchet.yml        75
D  scripts/check-hook-suppression-ratchet.mjs         1,149
D  scripts/audit-routes.sh                              272
D  scripts/check-placement-rate-provenance.mjs          260
D  packages/theme/src/non-text-contrast.test.ts         261
D  scripts/guard-registry.mjs                           213
D  scripts/theme-session.sh                             178
D  scripts/hook-suppression-baseline.json               102
D  packages/theme/src/css/fonts/*.woff2              4 files
   … plus 9 modifications and 5 submodule pointers
```

Every one of those files is **present on `origin/development` today** — verified with `git cat-file -e`
against the remote ref. The deletions are staged, on a branch named `development`, in a work tree
whose name suggests unrelated work. A single `git commit -m … && git push` removes the estate's
cron-health audit, its hook-suppression ratchet, its route audit, its placement-rate provenance guard,
its non-text-contrast test and its guard registry.

**Recommended:** `git worktree remove --force` it. It contains nothing that exists anywhere else
(ahead = 0), so nothing is lost, and leaving it costs a plausible bad afternoon.

---

## 6. One credential, reported not reproduced

The `origin` remote URL of `Desktop/Dev/archived-repos-docs/Monkey-One` embeds a GitHub personal
access token in the form `https://oauth2:<token>@github.com/…`. The token is not reproduced in this
document and should not be pasted into an issue, a commit message or a chat.

It is stored in plaintext in that repository's `.git/config` and is printed by any `git remote -v`,
so it should be treated as exposed regardless of whether it has been used.

**Do, in this order:** revoke the token at `github.com/settings/tokens`; then
`git -C <path> remote set-url origin https://github.com/GaryOcean428/Monkey-One.git`.
Both are yours to perform — this session will not touch credentials.

---

## 7. What this adds to the completion plan

New items, in the plan's own vocabulary. None is a rewrite of an existing phase; each is either an
input to one or a small standalone class.

| ID | Item | Where it belongs | Acceptance test |
|---|---|---|---|
| **BU-1** | Merge or close the 18 open PRs before re-deriving phase scope | Gate G0 | Phase 1's site count is computed from `development` **after** #1774 merges, and the PR that changes the count says so |
| **BU-2** | The award-rate refresh chain is inert while the repo says it is scheduled | Phase 5, blocking | Either a `cron.job` row invokes `refresh-award-rates` and a run is visible in `cron.job_run_details`, or the function and the comment are both deleted. Not one without the other |
| **BU-3** | 29 feature modules totalling ~4,000 lines are unreachable | Phase 6 (unreachable-code decision) | Every module is imported by something that renders, or deleted. A third state — "kept in case" — is not available, and the PR states which of the two each took |
| **BU-4** | braden's admin surface (~1,800 lines: DnD layout editor, media manager, site editor, storage-policy audit) is built and unrouted | Phase 6, needs a ruling | Operator ruling: **finish and route it, or delete it.** It is too large to leave undecided and too complete to delete without asking |
| **BU-5** | A lint exemption can outlive its subject's last import | Phase 0 (stop the bleeding) | A guard fails when `eslint.config.js` names a path no tracked file imports. Three current instances, one of which disables `bsuite/no-cross-app-write` on a 552-line unimported module |
| **BU-6** | `throughput/src/lib/user-management.ts` — 552 lines, cross-app writes, guard disabled, no importer | Phase 0 | Deleted, or re-enabled under the guard and imported. Not left inert with the rail off |
| **BU-7** | `bsuite-wage-audit` work tree stages 3,104 deletions of live guard infrastructure on `development` | Immediate | Work tree removed; `git worktree list` no longer shows it |
| **BU-8** | 35 vendored UI primitives across four apps are never used | Phase 6, low priority | Removed, or a stated policy that the shadcn/magicui set is vendored whole. Either is fine; silence is not |
| **BU-9** | ~~Two edge functions are unverifiable from inside the estate~~ — **CLOSED 2026-08-19.** Neither was unverifiable. `adobe-sign-webhook` was retired 2026-03-17 and recovered in error 2026-08-16; `jodie-pr-notify` has no webhook, no secret and a 0-row upstream | Phase 7 (doc repair) | **Met.** Adobe tombstoned to a 410 in crm7#1862 + empty column dropped; jodie's real gap named in §4.5. The finding that outlived it: "cannot verify from the repo" describes where you looked, not the system |

### The class behind BU-2, BU-3 and BU-5

All three are the same failure: **a claim of connection that nothing checks.** A comment says pg_cron
calls a function; a lint exemption implies a file is in use; a component's existence implies a route
reaches it. None of the three is verified anywhere, so all three drifted silently and stayed wrong.

Consistent with the completion plan's contract C-2 — *the default state is "I don't know"* — the
durable fix is not to correct the three instances but to make each kind of connection assertable:
an edge function declares its caller and a guard checks the caller exists; a lint exemption declares
its subject and a guard checks the subject is imported; a page component declares its route and a
guard checks the route is registered. Three small scripts. They retire this entire document's §3, §4
and §5 as a recurring category, which is the only outcome worth the work.

---

## 8. What this sweep did not settle

> **Superseded in one place by §9.** §9.0 records a method correction: the unreferenced-module
> scan globbed `src/**` and `app/**`, and R80.4's user interface is not under `src/`. Read §8
> with §9.5's scope note on §1 as well.

- **Runtime reachability.** A module can be imported and still never render. This sweep proves the
  negative (unreachable) and not the positive (reached) — 3.1 is sound, "everything else is wired" is not claimed.
- **The 60 non-estate repositories** on this machine. `Gary8D` (1,023 commits ahead of its remote HEAD),
  `deferred/minimuscles/muscles-base` (57 on `feat/neon-electric-ui`), `deferred/Dev2/lemurly` (8),
  `monkey-projects/monkey1` (27 commits, 334 dirty files) all hold unpushed work. They are outside the
  BSuite estate and outside this register's scope; they are named here only so that "nothing is stranded"
  is understood to mean *nothing in the estate*.
- **Whether braden's admin surface was abandoned or pre-built.** The git history would say. It is a
  ruling (BU-4) precisely because the answer changes what to do with 1,800 lines.

---

## 9. `bsuite notes.docx` cross-check — 19 August

**Added 2026-08-19.** The operator's running notes file (29.6 MB, saved 16:04 on 19 August;
68 screenshots; 381 paragraphs of text) was read in full and every checkable claim measured
against source, the live database, and the live deployments.

`docs/20260814-notes-backlog-verification-register-v1.00D.md` already covers this document as it
stood on **14 August** (4 dated sections, 67 screenshots, ~90 defects, identifiers `D-59`…`D-92`).
**This section covers only what is new or has changed since then**, plus every claim in the R8
block, which that register did not reach. New identifiers are `NX-n` — a distinct prefix, for the
same reason `VP-` exists: this estate has already paid once for two documents sharing a `V-` series.

### 9.0 The finding that reframes most of the R8 complaints

**R8's entire calculator UI is one 8,720-line, 554 KB file at the repository root:**
`charge-calculator-v9-2.tsx`, lazy-imported by `src/main.tsx:93` through a relative path that
escapes `src/`. Everything under `src/` is auth, layout shell, config and four auth pages —
32 files. The award engine beside it is **408 files, 187 of them tests**.

This single fact explains a cluster of separate-looking complaints:

| The note says | What is actually true |
|---|---|
| "Still no option for commercial construction" | The **engine has it**: `src/awards/ma000020-penalty-rows.ts:192` defines the label *Commercial construction*, and `allowance-catalogue.test.ts:65-69` asserts it is offered the general-building industry allowance — exactly the rule the note states. The string `commercial_construction` appears **0 times** in the UI file. |
| "Only 3 or 4 year apprenticeships — what about a traineeship or labour hire worker?" | The engine has `engagement-term.ts` with `ENGAGEMENTS`/`EngagementType`, `calculate.ts:69` handles labour hire explicitly, `casual.test.ts:129` tests it, and `src/lib/r80-deep-link.ts` **already parses `engagement=worker` from the URL**. The UI offers no control. |
| "All award allowances are always building and construction" | Hardcoded at three sites in the UI file: `DEFAULT_PENALTIES = penaltiesForSector("general_building")` (206), `DEFAULT_ALLOWANCES` built with `sector: "general_building"` (4129), and `useState<string>("general_building")` (4206). |
| "Apprentice % of Standard Rate always $29.54 / Yr1 14.725 no matter the award" | **Not a hardcode.** `29.54` appears nowhere in R8's source or the UI file; `14.725` appears only in tests, fixtures and one comment (`charge-calculator-v9-2.tsx:1531`). The card is not re-reading on award change. The fix is wiring, and hunting for literals will find nothing. |
| "This WAS working before R8.4" / "was done before the merge into the sub modules" | Consistent with the file's history: the engine was modularised into `src/awards/` around a UI monolith that was never rewired to it. |

**This is the same class as §3 and §4 of this document — capability that exists and is not
reachable — but it is worse, because here the unreachable capability is the product.** The
engine can price 36 awards; the UI is wired to one sector of one of them.

**Method correction this forces on §0.** The unreferenced-module scan globbed `src/**` and
`app/**`. R80.4 returned **0 unreferenced modules** partly because *its user interface is not
under `src/`*. That result stands for what it measured and is not evidence that R80.4 is clean.
Any future run of that scan must glob the repository root as well.

### 9.1 Verified true and open

| ID | Item | Evidence |
|---|---|---|
| **NX-1** | R8's UI is an 8,720-line root-level monolith wired to one sector of one award, over a 408-file engine | `charge-calculator-v9-2.tsx`; `src/main.tsx:93`; lines 206 / 4129 / 4206 |
| **NX-2** | `api/fwc.js` carries **no rate limit and no quota** while fronting a **metered** Fair Work subscription — and the sign-in redirect that used to shield it was removed by operator ruling 2026-08-18 | `src/main.tsx:146` says so in the code itself: *"NOT YET SAFE TO DEPLOY PUBLICLY … advertising the import buttons to the open internet against a metered subscription needs one first"*. Live probe: `r8.crm7.app/api/fwc` and `d.r8.crm7.app/api/fwc` both answer, JSON 401 without a bearer — so the bearer guard is real, but nothing caps a signed-in caller |
| **NX-3** | The Fair Work proxy explainer is still rendered in the MAPD card | `charge-calculator-v9-2.tsx:3880` (lane) and `:3685` (`development`) — *"Requests go to this site's own /api/fwc…"*. Present in **both** trees, so this is current, not a stale deployment |
| **NX-4** | "qualification not captured" is still shipped | line 6143 (lane) / 5622 (`development`) |
| **NX-5** | BSU formats **money as USD** and dates as US | `business-suite-unified/src/lib/utils.ts` — `formatCurrency` hardcodes `'en-US'` **and `currency: 'USD'`**; `formatDate` and `formatTime` hardcode `'en-US'`. Also `crm7/src/components/dashboard/recent-activity.tsx:102` and `crm7/src/components/whs/training-dashboard.tsx:256`. This is a larger defect than the date complaint that surfaced it |
| **NX-6** | Award search returns HTML where JSON is expected — `Unexpected token '<', "<!doctype "` | **Mechanism identified, call site not isolated.** `R80.4/vercel.json` rewrites every path that is **not** `api/`, `assets/`, `favicon` or `sw.js` to `/index.html`, so any fetch URL that loses its `/api/` prefix is answered with the SPA shell instead of a 404. Verified live: `/api/fwc/search` → 404 `text/plain`; `/api/fwc?path=…` → JSON 401. So the failing call is not under `/api/` |
| **NX-7** | ~~`wage_snapshots` does not exist in the database~~ **CORRECTED 2026-08-19 — wrong table, and the real finding is worse.** The service writes `wage_calculation_snapshots`, which **exists, is applied, and holds 0 rows**. Its 272 lines are imported by nothing, so **no snapshot is ever written** | `to_regclass('public.wage_snapshots')` → NULL because *that name was never the target*. `to_regclass('public.wage_calculation_snapshots')` → the table; `select count(*)` → **0**. Migration `crm7/supabase/migrations/20260423110000_ws2_wage_calculation_snapshots.sql` present and applied. `grep -rn wageSnapshotService crm7/src` excluding the file itself → **no importer** |
| **NX-8** | `fairwork-enhanced` (the 503 in the note) lives in **business-suite-unified** and is called from **six crm7 files** | `business-suite-unified/supabase/functions/fairwork-enhanced/`; callers in `crm7/src/components/{awards,common,fair-work}/…` and `crm7/src/lib/awards/index.ts`. A cross-app runtime dependency that neither repository declares — a class worth naming, not a one-off |
| **NX-9** | Airtable-class reporting still absent; platform-level reporting still offered to non-developers | Completion-plan Phase 3 and ruling D-66; register D1 unanswered since 2026-08-06 |
| **NX-10** | Cards on a shared backing card, resize regression, half-cut cards — raised "innumerable times", fixed page by page | This is D-62 stated by the operator in their own words. It is the completion plan's `## Class sweep` discipline, and it is the single most-repeated item in the notes |

#### NX-7 in full, because the corrected version changes what it means

The original row read as dead code against a table nobody built. It is the opposite: **the
table was built, the migration was applied, the service was written — and nothing calls it.**

`wageSnapshotService.ts` states its own purpose in its header: write an immutable
`wage_calculation_snapshots` row *"at timesheet-approval time so later edits to award rates /
MAPD data / apprentice_rate_configs never retroactively change what was billed or paid."*

**That guarantee is not in force.** Zero rows exist, so nothing today protects a billed amount
from a later rate change. In a payroll and compliance context that is the whole point of the
feature.

**The wiring point is identified and the work is correctly sized as a feature, not a fix.**
`src/lib/timesheetWorkflow.ts:48` transitions `pending_gto_review → approved` via `gtoApprove`;
that is where a snapshot belongs. But `createWageSnapshot` requires the **complete calculation
result** — `awardCode`, `apprenticeType`, `yearOfTrade`, `baseRateHourly`, `oteRateHourly`,
`superRate`, `calcConfig`, `calcResult`, `appliedRules`, `calcEngineVersion` — which means the
approval path must have *run* a charge calculation before it can record one.

**So NX-7 is gated on the money chain, not independent of it.** It needs what M-5 ("the award
engine is not wired to the calculator") and M-7 (`award_rates` empty, 156 awards) are for. Doing
NX-7 first would write snapshots of a calculation that cannot yet be trusted, which is worse
than writing none.

Recorded rather than started, for that reason.

### 9.2 Already fixed — do not re-file

Three items in the notes are closed in the codebase or the database. Re-filing them would burn a
rotation and, worse, would make the next reader distrust the rest of the list.

- **`enterprise_licence_events` "not found in the schema cache"** — the table **exists** today
  (`to_regclass` resolves; 0 rows). The error was true when written.
- **Competency-based progression in the calculator** — **already removed**, under operator ruling
  **D-68, 2026-08-13**. `charge-calculator-v9-2.tsx:5453` records the removal and assigns
  progression records, anniversary reminders and change-of-year notices to crm7 — which is exactly
  what the 19 August note asks for. The note is describing a build that predates the change, or a
  deployment that has not caught up. **Check the deployed bundle before acting.**
- **The placements freeze** — resolved. `placements_award_rate_resolution_status_check` is now
  **validated**, and **0** rows carry a charge rate with a null status.

### 9.3 The placements fix went further than the analysis proposed — please confirm

The analysis pasted into the notes was explicit about its own limit:

> *"My recommendation: set the 9 NULL-status rows (8 FutureBuild + 1 Braden Group) to `manual`. …
> The 12 `unresolved` rows in bsuite Platform are a different case — `unresolved` means resolution
> ran and failed, and they're demo seed in your own tenant, so I'd leave them frozen rather than
> overwrite a real signal. … What I won't do without you is touch the 12, or drop the constraint."*

Measured today, **all 21 rows read `manual`**, in two batches:

| Tenant | Status | Rows | Stamped |
|---|---|---|---|
| bsuite Platform | `manual` | 12 | 2026-08-06 07:03:46 |
| Braden Group | `manual` | 1 | 2026-08-06 07:03:46 |
| FutureBuild Academy | `manual` | 8 | 2026-08-19 02:46:31 |

The 12 that were reserved for your decision were changed **first**, in the same statement as the 1
that was not. `manual` asserts *a human typed this rate*; `unresolved` asserted *resolution ran and
failed*. If that change was not authorised, a real signal was replaced with a claim about
provenance — the precise thing the column exists to prevent — and it is not recoverable from the
row itself. **NX-11: confirm whether the 12 were authorised. If not, the fix is not to flip them
back — it is to record that their current status is unverified.**

### 9.4 True, but the cause is not what the note assumes

- **`/portal` "just redirects to dashboard."** The page is real — `crm7/src/pages/portal/index.tsx`,
  and it already contains a `SharePortalCard`. `resolvePortalRoute()` routes apprentice/worker,
  training-provider and host contacts to their portals, and sends owner/admin/manager on a GTO
  tenant to `/dashboard` **by design**. So the defect is the *rule*, not a missing page: a GTO
  admin has no route to the portal selector, which is the surface they need in order to send
  someone else their portal. **NX-12** — a one-branch change plus an entry point, not a build.
- **Dates.** R8 is not the offender: it uses `en-AU` for numbers and `en-CA` deliberately, for its
  `yyyy-mm-dd` shape (`charge-calculator-v9-2.tsx:220`, `4471-4483`). The `08/19/2026` rendering
  comes from the `en-US` sites in NX-5.

### 9.5 The two R80.4 clones

Both are current as of today and they are **not** the same tree:

| | `Desktop/Dev/bsuite/R80.4` (submodule) | `Desktop/Dev/R80.4` (lane) |
|---|---|---|
| Branch | `development` @ `3a92992` | `fix/sbt-rate-type-and-completion-plan` |
| `charge-calculator-v9-2.tsx` | 8,031 lines | **8,720 lines** |
| `src/awards` files | 398 | **408** |
| vs `origin/development` | — | **14 ahead, 1 behind** |

PR **R80.4#113** carries head `592d115`; the lane is further along, and at the moment of
measurement **two commits existed only on the laptop** — `90cc046` *"The reachability gate caught a
function of mine that nothing calls"* and a merge above it. **That is in-flight work, not stranded
work**, and it is the correct scope note on §1 of this document: §1 measured **idle** branches. An
actively-worked lane will always show unpushed commits, and finding some there is not a defect.

**NX-13 — while two clones exist, every R8 claim must name which tree it was measured in.** The two
differ by 689 lines of UI and 10 engine files; a finding measured in one and filed against the
other will be wrong roughly as often as it is right. This document names its tree at each line
above. That obligation ends when the lane merges and the submodule is again the only local copy.

### 9.6 New, from the 18–19 August entries

Not covered by the 14 August register, and each is small and well-specified by the operator:

| ID | Item |
|---|---|
| **NX-14** | Selecting an award in *Award, Trade & Qualification* does not populate the *Fair Work MAPD* card, or the reverse — users pick the award twice. Operator's preference: one control, placed high on the page |
| **NX-15** | `/settings/data` and `/admin/data` — cannot select all entities; a person renders as `person_id`, and the person's **name is not offered in "add field"** |
| **NX-16** | Explanatory clause text is filling the cards. Move to a collapsible right-hand panel, and make it exportable as an appendix on the quote |
| **NX-17** | Left panel should collapse, and should hold quote-thread history that the user can group and save as templates |
| **NX-18** | "Rates at" appears several times — one effective date, shown once |
| **NX-19** | Payroll tax must be zeroable, for exempt apprenticeships |
| **NX-20** | Oncosts card says "WA on all wages (not just super base)" — mixes *base wage* with *ordinary/qualifying earnings*. Super is assessed on qualifying earnings; the wording implies base only |
| **NX-21** | "Unsuspended" is not a word — the states are **Active** and **Suspended** |
| **NX-22** | Allowances should not all be visible. Mark which are added by default into the ordinary-hours calculation; add the rest one at a time from a picker, each adding its own calculation row |
| **NX-23** | No trade selector for MA000036, and the trade list, allowance bands and clauses shown under it are MA000020's — which do not carry across awards |
| **NX-24** | Export the quote to PDF, push it to a crm7 placement, and send it for eSigning through crm7's email — none of the three exists |
| **NX-25** | Quote size ordering reads *small / medium / big*; should be *medium / small / big* per the operator's preference |

### 9.7 The architecture question the notes raise, unanswered

The notes carry a worked comparison of **Vite Module Federation** against **multi-zone routing**,
with the operator's own framing: *"if someone has a CRM subscription it just presents the CRM; if I
have CRM and reports, the CRM has an additional reports navigation link and I access the reports
from what still feels like I'm in the CRM environment."*

That is a genuine architectural decision and it interacts with two things already on record:

- It is the same shape as the Airtable-class reporting question (register **D1**, unanswered since
  2026-08-06, completion-plan Phase 3). A federated "reports" module *is* one credible answer to
  D1 — decide them together or the second decision will be constrained by the first.
- The estate's canonical auth already satisfies the hard part. `AUTH_CANONICAL.md` mandates BS
  OAuth 2.1 PKCE with per-domain sessions and silent re-auth. Both federation and multi-zone work
  under that; **neither requires reintroducing cookie SSO**, and any advice that appears to is the
  pattern this estate deprecated on 2025-02-27.

**NX-26 — this is a ruling, not a task.** It belongs beside §9 of the completion plan, and until
it is made, "make reports look like Airtable" is under-specified: it does not say whether the
result is a page inside crm7 or a separately deployed module that appears inside crm7.

### 9.8 Where these land

| Item | Phase in `plans/20260817-estate-completion-plan-v1.00D.md` |
|---|---|
| NX-2 (metered proxy, no quota, publicly reachable) | **Phase 0 — stop the bleeding.** It is the only item here with an unbounded downside, and the code already says so |
| NX-11 (the 12 placement rows) | **Phase 0** — a confirmation, not a code change |
| NX-5 (USD/en-US in shared helpers) | Phase 0 — three files, one class |
| NX-1, NX-23 (UI wired to one sector of one award) | **Phase 5**, and it changes the phase's shape: this is *wiring an existing engine*, not building a calculation |
| NX-3, NX-4, NX-16, NX-17, NX-18, NX-20, NX-21, NX-22, NX-25 | Phase 1 and Phase 2 — honest states and first paint; all small |
| NX-6, NX-8 | Phase 4 — the cross-app and cross-origin call paths nothing declares |
| NX-9, NX-15, NX-26 | **Phase 3**, gated on ruling D1 + NX-26 together |
| NX-12 (portal entry point) | Phase 6, with the portal rulings D-93…D-98 |
| NX-14, NX-19, NX-24 | Phase 5 |
| NX-13 (name the tree) | Immediate, and it expires when the R80.4 lane merges |

### 9.9 What this cross-check did not settle

- **Whether the deployed bundles match these trees.** Three items (competency progression,
  `enterprise_licence_events`, the MAPD proxy copy) turn on that, and the note's screenshots are of
  a running site, not a checkout. Two of the three read as *already fixed in code* — if the
  operator is still seeing them, the gap is deployment, and that is a different fix.
- **The exact call site behind NX-6.** The mechanism is proven (`vercel.json` rewrites everything
  outside `/api/` to the SPA shell); the failing URL was not isolated, and it needs one look at the
  network tab while reproducing the award search.
- **68 screenshots.** They were counted, not read. Several notes point at a picture rather than
  describing the defect ("Borders on people card are still all messed up", "Here's the whole
  thing"). Those are recorded as unassessed rather than guessed at.
- **Anything already covered by the 14 August register.** `D-59`…`D-92` and its §7 "not filed
  anywhere" list are not re-verified here; §9 is a delta, and the two should be read together.
