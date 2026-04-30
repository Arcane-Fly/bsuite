# BSuite Finish-Line Review Sign-Off (2026-04-27)

**Status:** W — Working (BLOCKING USER DECISION on 2 deep-fork reconciles)
**Date:** 2026-04-27
**Trigger:** Operator's critical review of the 2026-04-25 finish-line session flagged 10 substantive concerns + asked for explicit ratification on 3 doctrine drifts + asked for a "real fix" on a previously admin-bypassed CI check.

This session addressed all 10 review concerns. Result: **5 of 7 repos promoted to main**, **2 deep-fork repos (crm7 + bsuite parent) stopped at green-dev awaiting operator decision** on per-file vs per-PR consolidation.

---

## What this session delivered

### Doctrine reconciliation (concerns #1, #2, #5, #7 from review)

| Item | Resolution |
|---|---|
| **CRM7 pnpm pin** (frozen #4 violation) | PR #314 — pinned to 10.30.3 suite-wide; lockfile regen via temp-dir recipe; CI green without --admin. |
| **Conduit auth doctrine** (frozen #5 — smoke vs reality) | Verdict (C) — doctrine was technically correct on mechanism but mischaracterized SSO posture. Conduit IS a cookie-SSO consumer with delegated login UI to BSU's `/login` (since PR #102 / 8a3143e by Braden, 2026-03). Updated parent CLAUDE.md to reflect reality. Investigation doc: [`docs/20260427-conduit-auth-doctrine-investigation-v1.00W.md`](20260427-conduit-auth-doctrine-investigation-v1.00W.md). |
| **tenants/user_tenants ownership** (frozen #2 ratification per review #7) | Historical note: this item was open when this signoff was written. It was later closed by `@bsuite/dry-lint@0.2.0`, which added writers-schema support and set `tenants` / `user_tenants` to `writers: ["bsu", "crm7"]`. Current status lives in the 2026-04-27 outstanding-work ledger and Phase 2 shared-packages plan. |

### Security hardening (concern #3 — SECURITY DEFINER audit)

`is_team_admin` audit verdict: **PASS** on all axes (owner=postgres, STABLE, search_path=`public, pg_temp`, JOIN-style auth.uid validation, REVOKE PUBLIC/anon, GRANT authenticated/service_role). User authorized **tightening to `search_path=''`** (strictest — body already fully-qualified).

Audit also surfaced 1 FAIL out-of-original-scope: `public.set_payroll_super_due_date` had `search_path = NULL` (canonical privilege escalation vector via schema shadowing). User authorized fix.

**Both fixes applied LIVE to Supabase project `tuybltdrdefjblnplpqo` via MCP.** Source-of-truth migration `20260427000000_security_definer_hardening.sql` landed in BSU PR #197. Audit doc: [`docs/20260427-security-definer-audit-v1.00W.md`](20260427-security-definer-audit-v1.00W.md).

### Dev/main fork RCA + remediation (concern #1 + reconcile gating)

| Phase | Outcome |
|---|---|
| **2 RCA** | Verdict (C) **hybrid** for both bsuite parent + crm7. Dominant mechanism: dual-merge force-push (likely Cascade IDE auto-snapshot workflow). NOT pure hotfix-bypass; NOT pure squash-skew. Reconcile was identified as gate-blocked until branch protection enforced. RCA doc: [`docs/20260427-dev-main-fork-rca-v1.00W.md`](20260427-dev-main-fork-rca-v1.00W.md). |
| **2-gate** | PR #280 — branch protection enforced on all 14 refs (7 repos × 2 branches): `allow_force_pushes: false`, `prs_required: true (0 reviewers)`, `enforce_admins: true`. Existing required CI checks preserved. **Operator note:** Cascade IDE direct-push workflows will now fail server-side. Doc: [`docs/20260427-branch-protection-enforcement-v1.00W.md`](20260427-branch-protection-enforcement-v1.00W.md). |
| **2-backport** | PR #284 — all 26 bypass PRs (10 parent + 16 crm7) classified as **(a) already in dev+main via squash-merges**. Zero cherry-picks needed for those 26. Doc: [`docs/20260427-bypass-pr-audit-v1.00W.md`](20260427-bypass-pr-audit-v1.00W.md). |
| **2b reconcile** | **5 of 7 repos promoted to main** — see table below. **2 deep-fork repos (crm7 + parent) need operator decision** because the divergence is BROADER than the 26 bypass PRs (entire packages + selectors + AI features + GTO docs absent from dev). |

### Test debt remediation (concern #2 — quarantine)

Throughput's 9 quarantined test files: **ALL FIXED** (none deleted). Test count went **80 → 170 tests** (+90 net new tests). Source code upgraded to match better API the tests described — no `.skip()` introduced, no assertion weakening, no `continue-on-error` masking. CI guardrail (`quarantine-guard` job in `.github/workflows/ci-cd.yml`) fails when `vitest.config.ts` exclude array grows beyond `vitest-quarantine-baseline.json`. PR throughput #49 (b04c576).

### CI infrastructure fixes (concern #6 — size-limit bypass pattern)

BSU `size-limit` failure root-caused: **H3 stale globs** — `.size-limit.json` referenced chunks Rollup no longer emits (AuthContext now inlined into index, react/supabase merged into vendor). Real fix in PR #198 — CI passes naturally, **no --admin needed**. Pattern flagged: WS-J's admin-bypasses were unnecessary; the failure was diagnosable in ~5min once local dist rebuilt clean.

### Visual smoke gap (concern #9)

WS-J's 10-screenshot sample brought to **144 captures** (100% capture rate, 6 apps × ~7 routes × 2 modes × 2 viewports). Found **1 medium bug**: throughput SSO redirected to `/auth/login` but BSU registers `/login` — fixed in throughput PR #50 (one-line change). Plus 2 routes diverged >5% (content drift, not regressions). Report: [`docs/20260427-visual-smoke-completion-v1.00W.md`](20260427-visual-smoke-completion-v1.00W.md).

### Operator handoff restoration (concern #10)

Xero (Part O.2) restored to operator handoff doc as Item 11 — was silently dropped from the 6-item list during 2026-04-25 session. PR #281. Handoff doc now has 7 operator-only items (~70 min total estimated time).

### WS-D 0.3.0 yank narrative (concern #8)

Audited. **Zero consumer lockfiles resolve to 0.3.0.** **Zero production exposure** (3 preview deploys errored at build, 2 succeeded but didn't import the broken `preset-v4.css`). 0.3.0 deprecated on npm with explanatory message. PR #282. Narrative doc: [`docs/20260427-theme-0.3.0-yank-narrative-v1.00A.md`](20260427-theme-0.3.0-yank-narrative-v1.00A.md).

### Schema-registry republish (concern from session-D follow-up)

`@bsuite/schema-registry@0.2.1` published with **95 internal imports fixed** (added `.js` extensions for Node strict ESM compliance). BSU vitest workaround removed (`vitest.config.ts` shrunk 73 → 31 lines). 5 PRs: parent #286, BSU #199, R80.3 #109, braden #160, conduit #116. **6b discovered the schema-registry source was missing from local `development` (only on main)** — first concrete evidence that dev/main divergence is broader than the 26 bypass PRs.

---

## Promotion state per repo

| Repo | Dev tip | Main tip (post-reconcile) | Promotion PR | Vercel deploy | READY? |
|---|---|---|---|---|---|
| business-suite-unified | 2f4a10d | **23a4627** | #200 | `dpl_9yiAXf8vZqFtqSLLvdbWQn1CwkUz` | ✅ |
| conduit | 7d8e55a | **8c253ba** | #117 | `dpl_3rtKo9p2gtcTdwA2r4vzq8A1Hk3p` | ✅ |
| braden | c819bb0 | **a3be923** | #161 | `dpl_CJu9U1747ALNYGobDdPP7vmwZ6xY` | ✅ |
| R80.3 | 16be7be | **9cf3408** | #110 | `dpl_9G68eSF2XW2qBBVnL7vAdukBmp9x` | ✅ |
| throughput | 7f2f934 | **bc1f120** | #51 | `dpl_8Lfm3zp4yZMvxRZskfCpRwFQy1V6` | ✅ |
| **crm7** | c3630713 | 8e6dd651 (unchanged) | **#316 closed (BLOCKED)** | n/a | n/a |
| **bsuite parent** | f8a6a18 | ab10882 (only #288 submodule bump landed) | **#287 closed (BLOCKED)** | n/a | n/a |

Parent submodule bump via PR #288 (`f8a6a18`) — 5 pointers updated to current main HEADs; crm7 pointer to dev tip.

---

## Operator decision required: crm7 + bsuite parent reconcile

The deep-fork divergence is REAL and not autonomously resolvable. Per the 2b agent's analysis:

- **crm7**: 145 main-only files (entity selectors, AVETMISS formatters, TimesheetStateBadge, AI jodie-rate-review, ws8 scripts, billingEngine tests, GTO master plan docs, dry-lint + e2e workflows) + 379 modified-both + 56 dev-only files.
- **parent**: 173 main-only files + 30 dev-only files + 42 modified-both.

A naive `gh pr merge` produces 376 conflicts on crm7. `git merge -X ours` reduces to 3 manual conflicts but **strips 191 substantive files of main-only content** — unacceptable since main is currently the production deploy source.

### Three options for operator

| Option | Action | Trade-off |
|---|---|---|
| **A. Per-file consolidation** | Operator (or a series of focused agent sessions) reviews each of the 145+173 main-only files, decides whether to keep main's version or merge with dev, lands as a focused PR. | Highest fidelity but ~1-2 weeks of work. |
| **B. Per-PR cherry-pick onto dev** | Identify the original main-side commits/PRs and cherry-pick onto dev branch, organized by topic. | Preserves provenance. Estimated 145+173 commits to triage. |
| **C. Reset dev to main + re-apply session work** | `git reset --hard origin/main` on dev. Then re-PR all this session's work (BSU #197, parent #283/#284/#286/#288, crm7 #283/#315, etc.) by cherry-pick. | Fastest — reduces dev/main divergence to zero. Risks losing dev-only work that wasn't covered (the 56 crm7 + 30 parent dev-only files). Each must be triaged BEFORE the reset. |

### Recommendation

**Option B for crm7 + Option A for parent.** Crm7's main-only commits are mostly feature work (selectors + AVETMISS + AI features) that should be shipped on dev too. Parent's main-only work is mostly submodule pointer bumps + docs that need per-file review.

Historical note: the reconcile was completed in the later finish-line session;
current status lives in the 2026-04-28 final signoff and outstanding-work ledger.

---

## Validation summary

- **Branch protection working as designed.** 2-gate's enforcement caught and rejected the very direct-push that submodule-bump tried (forced PR path via #288).
- **No --admin bypassing required CI.** All 5 promoted repos' dev→main PRs went through their full required CI suite. `--admin` was used only for non-required Vercel CLI dead-scaffolding workflows that pre-date this session.
- **DB security state is strictly better.** SECURITY DEFINER NULL-search_path FAIL eliminated; is_team_admin tightened to `search_path=''`.
- **No new test debt.** Throughput quarantine fully resolved; CI guardrail prevents recurrence.
- **No new doctrine drift at signoff time.** Later Phase 2 work closed the queued dry-lint writers-schema ratification.

---

## Historical Outstanding Snapshot

This section is superseded by
[`docs/20260428-finish-line-final-signoff-v3.00W.md`](20260428-finish-line-final-signoff-v3.00W.md),
[`docs/20260428-operator-handoff-v3.00W.md`](20260428-operator-handoff-v3.00W.md),
and the current outstanding-work ledger.

Items previously listed here for CRM7 reconcile, parent reconcile, and
`@bsuite/dry-lint@0.2.0` writers-schema work have shipped. Current remaining
operator-only items live in the active operator handoff.

---

## Status

This session is **NOT BRANDED FINISHED**. CRM7 and bsuite parent are not on main yet. The operator-decision-required reconcile is documented but unexecuted.

What this session genuinely closed:
- All 10 critical-review concerns addressed.
- 5 of 7 repos promoted (BSU/conduit/braden/R80.3/throughput).
- Branch protection enforced server-side.
- Doctrine drifts ratified or reverted with explicit user sign-off.
- Security gap closed (live DB hardened).
- Visual smoke gap closed.
- Test debt eliminated (throughput).
- Real fix shipped for the size-limit admin-bypass pattern.

Awaiting operator's choice on Option A/B/C for crm7+parent before this can move to status A.

---

**Author:** Claude Opus 4.7 (1M context) — coordinator of 2026-04-27 review session, with explicit acknowledgement of 2026-04-25 framing errors per operator's review.
