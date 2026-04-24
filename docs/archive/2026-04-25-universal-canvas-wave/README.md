# Archive — 2026-04-25 Universal Canvas Wave

This bucket captures docs superseded by the **Universal Canvas master execution
plan** delivered during the 2026-04-25 archival + consolidation sweep
(Wave-5 ARCHIVAL subagent — user directive 2026-04-25: *"docs cleanup and
roadmap update of all completed. archival of all completed work, duplicate
documents, update of all remaining work."*).

Files here are read-only historical references. Do not resurrect — follow the
successor doc listed in the table below.

## Contents

| Archived file | Prior status | Archive reason | Successor (authoritative) |
|---------------|--------------|----------------|---------------------------|
| `20260423-phase5-schema-pagebuilder-implementation-v1.00W.md` | Working (W) | 1528-line Phase 5 implementation plan drafted 2026-04-23. Every Phase 5 PR (5.0 → 5.6) has landed (see `docs/plans/README.md` row for PR chain). Remaining cross-app page-builder + universal-canvas work is now tracked end-to-end in the master execution plan with explicit subagent dispatch commands. | [`docs/20260425-universal-canvas-master-execution-plan-v1.00W.md`](../../20260425-universal-canvas-master-execution-plan-v1.00W.md) — §1 Ground-truth status, §3 Execution waves, §10 References (listed as `phase5-spec`) |
| `20260316-mermaid-ui-builder-reference-v1.00A.md` | Approved (A) | March 2026 legacy diagram-driven UI builder vision. Superseded by the universal-canvas architecture (`PageGridLayout.tsx` + `@bsuite/schema-registry` + `TenantLayoutSlot`) — actual runtime schema + page-builder is now DB-backed, not mermaid-driven. The architect's synthesis in the master plan explicitly tags this doc as superseded. | [`docs/20260425-universal-canvas-master-execution-plan-v1.00W.md`](../../20260425-universal-canvas-master-execution-plan-v1.00W.md) — §2 Five must-haves → implementation map, §2.1 Reference widget specs |

## What was NOT archived in this pass

The finish-line roadmap
(`docs/20260425-bsuite-finish-line-roadmap-v1.00W.md` §Superseded-triggers
table) lists ten additional docs staged for eventual archival, but each has an
explicit trigger condition (specific PR SHA or operator action) that has not
yet been met. Those docs stay live until their owning item ships:

- `20260415-roadmap-audit-delta-v1.00W.md` — trigger: P0-15 (roadmap v5.03W bump) merged
- `20260423-cross-app-write-audit-v1.00W.md` — trigger: all 8 P1.A items shipped (currently 6 of 8)
- `20260423-misplaced-routes-audit-v1.00W.md` — trigger: P1.B + P2-19/20 shipped
- `20260420-react-hooks-v7-tech-debt-v1.00W.md` — trigger: P1.E batch shipped
- `20260421-k8-retroactive-audit-v1.00W.md` — trigger: P1-79/80 shipped
- `20260421-storage-rls-reserved-prefixes-v1.00W.md` — trigger: P1-31/32 operator dashboard action complete
- `20260421-supabase-realtime-blocks-rollout-v1.00W.md` — trigger: P1-63/64/65 shipped + 14-day green window
- `20260422-typescript-6-migration-evaluation-v1.00W.md` — trigger: G-1 (TS 6.0 GA + typescript-eslint compat)
- `20260424-oauth-preview-redirect-runbook-v1.00W.md` — trigger: P0-6 sign-off (Parts A + B + C all ticked; Part C = Supabase dashboard allowlist = operator)
- `20260317-bsuite-gap-report-v2.00W.md` §11 — trigger: master-roadmap v5.03W rollup supersedes

Each of these will move into a dated archive bucket as soon as its trigger
ships. Refer to OUTSTANDING.md §3 for the running log of archive batches.
