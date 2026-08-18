# Built but unlanded, built but unwired — a machine sweep

**Document:** `docs/20260817-built-unlanded-and-unwired-register-v1.00W.md`
**Date:** 2026-08-17 · **Version:** 1.00W · **Status:** W — Working
**Scope:** every git work tree on this laptop, and every source module and edge function in the six apps
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
imports — one script, and it retires all three of these plus any future instance.

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

**There is no such cron job.** The live `cron.job` table holds 16 entries; none references an award
rate, and no vault secret exists for one. `sync-award-rates` is invoked by `refresh-award-rates`
(its own header comment says so, `index.ts:81`), and `refresh-award-rates` is invoked by nothing.
The chain is complete and unreached from end to end.

This is not a tidy-up item. The completion plan's Phase 5 is the calculation engine, and the FWC
Annual Wage Review 2026 became operative on **1 July 2026** — six weeks ago — with a **non-uniform**
C13/C14 structural adjustment that no flat-percentage path can absorb. A refresh function that never
runs cannot make rates stale-detectable, and a comment asserting a scheduler that does not exist is
worse than no comment, because it answers the question "is this wired?" incorrectly for anyone who
greps for it.

`update-wage-rates` (123 lines) is the benign case in the same family: the repo describes it as
"a deprecated proxy with no authority of its own", which is consistent with having no caller. It
should be deleted rather than explained.

### 4.3 Plausibly reached from outside — flagged, not claimed

`crm7/adobe-sign-webhook` (320) and `business-suite-unified/jodie-pr-notify` (239) have no in-app
caller and no cron job, which is exactly what a webhook receiver and a CI notifier should look like.
This sweep cannot see Adobe's configuration or a workflow in another repository, so they are recorded
as **unverified**, not as dead. Settling them takes one look at each external configuration.

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
| **BU-9** | Two edge functions are unverifiable from inside the estate (`adobe-sign-webhook`, `jodie-pr-notify`) | Phase 7 (doc repair) | Each has a line in its own header naming its external caller, or it is deleted |

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

- **Runtime reachability.** A module can be imported and still never render. This sweep proves the
  negative (unreachable) and not the positive (reached) — 3.1 is sound, "everything else is wired" is not claimed.
- **The 60 non-estate repositories** on this machine. `Gary8D` (1,023 commits ahead of its remote HEAD),
  `deferred/minimuscles/muscles-base` (57 on `feat/neon-electric-ui`), `deferred/Dev2/lemurly` (8),
  `monkey-projects/monkey1` (27 commits, 334 dirty files) all hold unpushed work. They are outside the
  BSuite estate and outside this register's scope; they are named here only so that "nothing is stranded"
  is understood to mean *nothing in the estate*.
- **Whether braden's admin surface was abandoned or pre-built.** The git history would say. It is a
  ruling (BU-4) precisely because the answer changes what to do with 1,800 lines.
