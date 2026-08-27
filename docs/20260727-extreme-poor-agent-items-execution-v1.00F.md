---
kind: record
authority: none
owner: bsuite-lane
---

# Extreme-poor agent items — ground-up execution log (2026-07-27)

> **Predates the R80.3 → R80.4 restructure (2026-08-06).** R80.3 left the submodule set
> that day (`5e000c35`, operator directive); R80.4 took its place and serves `r8.crm7.app`.
> Paths under `R80.3/` below are HISTORICAL — the originals are in
> `~/Desktop/Dev/archived-repos-docs/R80.3`. They are deliberately NOT rewritten: R80.4 is a
> restructure, not a rename, so a rewrite would swap a visibly stale pointer for one that
> looks current and is still broken. Authority: `docs/README.md`.

Source ranking: `docs/20260727-multiapp-agent-blindspot-investigation-ledger-v1.00W.md` (higher # = worse).  
This file tracks **execution evidence** for the most extreme items first (ground-up rebuild of process after older-model era).

## #27 Long-lived `development` auto-deleted on promote — FIXED (process)

| Repo | `delete_branch_on_merge` before | after |
|------|----------------------------------|-------|
| crm7 | true | **false** |
| conduit | true | **false** |
| throughput | true | **false** |
| BSU / bsuite / R80.3 / braden | false | false |

**Evidence:** `gh api repos/... --jq .delete_branch_on_merge`  
**Standing rule:** After any development→main promote, still verify `refs/heads/development` exists.  
**Symptom this session:** crm7 `development` deleted twice when promote PRs merged with auto-delete on.

## #24 Cookie-SSO regression — GUARDED (no live code hit)

- Forbidden patterns only appear in **docs**, **negative contract tests**, and **comments**.
- Live clients: oauth-contract tests in crm7/conduit/BSU/R80/throughput/braden assert absence of `cookieStorage` / `business_suite_auth`.
- `conduit/.../bs-oauth-cookie.ts` uses **app-local** OAuth cookies (not suite-wide SSO cookie) — not a regression of removed cookie SSO.
- **Residual risk:** agent reintroduces pattern; CI grep (AUTH_CANONICAL §) must stay red on new hits outside allowlist.

## #29 `auth_tenant_id()` SETOF vs equality — MOSTLY CLEAN; residual PL/pgSQL assign

- Live migrations largely use `tenant_id IN (SELECT auth_tenant_id())`.
- **Bad pattern in comments/history** only for policy equality (phase12 docs).
- **Live bug class residual:** BSU branding RPCs historically used `v_tenant_id := auth_tenant_id()` which throws SQLSTATE 21000 on SETOF (fixed in `20260428010027_fix_branding_select_policy...`). Confirm no remaining `:= auth_tenant_id()` in **current** function bodies on live DB (next: linked `db query`).
- crm7 `orgDocumentService.test.ts` explicitly guards against `= auth_tenant_id()`.

## #26 Publish-before-pin / schema package lag — OPEN (P0 package debt)

| App | `@bsuite/schema-builder` | `@bsuite/schema-registry` |
|-----|--------------------------|---------------------------|
| published | **1.0.1** | **1.0.0** |
| crm7 | ^0.7.3 | ^0.3.6 |
| conduit | ^0.7.3 | ^1.0.0 |
| BSU | ^0.7.3 | ^1.0.0 |
| R80.3 | ^0.7.3 | ^1.0.0 |
| throughput | — | ^0.3.6 |
| braden | — | ^1.0.0 |

**Next:** coordinated pin bump after consumer smoke (Feature Builder / schema pages) — not a blind version bump. Follow DEPENDENCY-BUMP-CHECKLIST + outside-workspace lockfile regen.

## #25 Glued cards — IN PROGRESS

| Batch | Status | Ledger |
|-------|--------|--------|
| burn 1–3 | merged main/dev | ~103 |
| burn 4 | merged development; promote #1225 | **92** |
| burn 5 | running | TBD |
| BSU contract | main | 9 widgets remain |
| conduit contract | #382 merged development; promote #383 | 0 pending after unglue of top 3 |

## #30/#31 False complete / incomplete verification — PROCESS

- Verifier = main agent runs vitest/tsc after CLI lanes.
- Investigation ledger requires citations.
- DoD skills required on claim.

## Qwen CLI diagnosis (this session)

| Check | Result |
|-------|--------|
| npm package | upgraded **0.19.10 → 0.21.0** |
| short API `qwen3.8-max-preview` | OK (~2s) |
| short CLI `-p "ok-cli"` | OK |
| long chat/completions council call | **TimeoutError** after ~480s (Bailian stream hang on large max_tokens) |
| agentic multi-file lanes | **Work** (burn-4, conduit, burn-5) |
| Claude Code | **weekly limit** until ~14:00 Australia/Perth |

**Mitigation:** prefer Qwen for agentic coding; for long council text use Kimi/OpenRouter or chunked Bailian calls (`max_tokens` lower + multi-turn). Do not treat Bailian timeout as “out of credit.”

## Next extreme priorities (ordered)

1. Finish burn-5 + promote burn-4/5 to main without deleting development  
2. Live DB audit for `:= auth_tenant_id()` / policy equality  
3. Schema-builder/registry pin plan (crm7 first consumer of Feature Builder)  
4. Money RPC idempotency audit (#28)  
5. Cross-app SSO E2E (#19)

## #28 Money RPC orphan — FIXED (crm7#1226 merged)

- `approve_funding_claim` / `reject_funding_claim` status gate aligned to `submitted|under_review|pending`
- `fundingService.reviewClaim` calls RPCs
- `markAsPaid` no longer double-decrements `remaining_budget`

## #25 burn-5 — PR open

- crm7#1227 `feat/unglue-burn-5` — ledger **81** (from 92 after burn-4)
- 12 commits: funding-sources, incentive-calendar, gto-compliance suite, hosts detail/agreement

