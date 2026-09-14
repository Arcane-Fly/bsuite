# chore(hardening): deferred Phase 1/3/4 items from 20260513 plan

https://github.com/GaryOcean428/bsuite/issues/1505

Snapshot updatedAt: 2026-08-31T02:49:17Z. Open at capture; re-read live.

Consolidated tracking issue for the genuinely-deferred rows of `docs/plans/20260513-bsuite-consolidated-hardening-v1.00W.md`, per the bsuite#1499 reconciliation (2026-06-10). Rows below were verified as NOT implemented (no merged PR, no source-tree evidence); all other Phase 1/3/4 TODO rows gained completion evidence in the same reconciliation.

## Deferred rows

### 1.4 — Custom Access Token Hooks audit
Verify all 11 required claims are preserved by any Custom Access Token Hook on `tuybltdrdefjblnplpqo`. Evidence check 2026-06-10: zero `custom_access_token` references in any repo's source/functions; no merged PR touches token hooks. If no hook is configured in the Supabase dashboard, record that finding in the plan and close this row as N/A.

### 1.5 — Production SMTP configured (operator-side)
Supabase default SMTP is rate-limited to ~2 emails/hr — production needs a real SMTP provider via dashboard. Operator action; not in `operator_blockers` as of 2026-06-10. Add to `operator_blockers` when picked up.

### 4.1 (remainder) — Zod 4 top-level format sweep across app src trees
bsuite#950 (merged 2026-05-13) swept `packages/*` only. Grep 2026-06-10: **436** `z.string().email()/.uuid()/.url()` occurrences remain across the 6 app `src/` trees (crm7 the bulk). Codemod per the acceptance criteria in bsuite#949; verify chained refinements transfer (`z.string().email().min(5)` → `z.email().min(5)`).

### 4.2 — `z.discriminatedUnion()` for tagged unions
Grep 2026-06-10: zero `discriminatedUnion` usages in crm7 src. Per-schema work (e.g. `apprentice_handoff_tokens.kind`).

### 4.3 — Move duplicated schemas to `packages/schema-registry`
No merged PR found performing cross-app schema dedup into the registry. Per-schema work.

### 4.4 — `safeParse` everywhere on trust boundaries
Audit per route handler / edge function. Grep 2026-06-10 baseline: crm7 417 `safeParse` call sites, BSU 8, throughput 2, conduit/R80.3/braden 0 — the zero-count apps need the audit most.

## Acceptance criteria

- [ ] Each row above either implemented (PR link) or explicitly closed with a recorded N/A rationale in the plan doc
- [ ] Plan doc `20260513-bsuite-consolidated-hardening-v1.00W.md` "Deferred (tracked)" section updated row-by-row as items close

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

- **Validation loop**: §9.1 output-equivalence
- **Equivalence target**: grep counts → 0 for 4.1/4.2 targets; Supabase dashboard state for 1.4/1.5; route-handler audit table for 4.4
- **Cross red-team**: claude-code verifies evidence rows before flip-to-done
- **Skills to load**: supabase-auth-comprehensive, security-audit, forms-and-validation
- **Self-report on divergence**: yes (mandatory; do not rationalise gaps)
