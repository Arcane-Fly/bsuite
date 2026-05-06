# Handoff Sleep Packet — apprentice_placements wiring

**Protocol:** BSuite Agent Coordination Protocol v1.2 §13 (sleep-packet handoff)
**From:** codebuff (Audit + Reconciliation)
**To:** claude-code (Implementation + Governance)
**Work ID:** `bsuite_apprentice_placements_wiring_20260506`
**Checkpoint phase:** `handoff` (final packet from codebuff side; claude-code creates new packets at 75% / 90% / completion of its own eta)
**Created:** 2026-05-06
**Status:** active
**Document version:** v1.00W

> **Payload vs companion:** The prose sections 1–6 below are the
> human-readable companion document (~9KB, exceeds §13's 4KB soft limit for
> memory-key payloads). The **JSON block in section 7 IS the sleep-packet
> payload** that should be written to
> `bsuite_handoff_bsuite_apprentice_placements_wiring_20260506_<seq>`
> (~3.8KB, within §13 limits). Per the coordination protocol, claude-code
> should ack with a Continuity Summary via the
> `bsuite_chat_inbox_codebuff` inbox (or by editing section 6 of this file)
> before starting work.
>
> **Memory-API access note (2026-05-06):** Codebuff was unable to reach the
> `bsuite_*` KV store directly from its execution environment, so the
> following writes are pending human/claude-code execution. Use a seq of
> the form `<unix_millis>-cb` for every new key created here; the examples
> below use `1746489600125-cb` as a placeholder — replace with a fresh
> current millisecond timestamp at write time.
>
> 1. **`PUT bsuite_handoff_bsuite_apprentice_placements_wiring_20260506_1746489600125-cb`** ← body is the JSON block from section 7 verbatim (after filling `head_sha` once committed). **Before PUT, verify `head_sha` no longer starts with `<pending`** — a placeholder value must not be persisted. **If a previous attempt at this key exists or you suspect the silent-drop bug (GET returns HTTP 500 `Unexpected end of JSON input`), DELETE the key first, then PUT.** Raw PUT retries on a corrupted key stay corrupted per the coordination protocol's Silent-drop bug recipe.
> 2. **`PUT bsuite_chat_msg_1746489600126-cb`** with body:
>    ```json
>    {
>      "seq": "1746489600126-cb",
>      "from": "codebuff",
>      "to": "claude",
>      "type": "handoff",
>      "ref_work_id": "bsuite_apprentice_placements_wiring_20260506",
>      "body": "Handoff packet staged at bsuite_handoff_bsuite_apprentice_placements_wiring_20260506_1746489600125-cb. 6-layer wiring plan for apprentice_placements (migration applied, service, UI, AVETMISS, STA hooks, audit+tests). ETA 8–12h across 2 sessions. See docs/20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md for full context. Ack expected at bsuite_chat_inbox_codebuff with Continuity Summary per §13.",
>      "ts": "<ISO-8601 UTC timestamp at write time>"
>    }
>    ```
> 3. **Read-modify-write** `bsuite_chat_inbox_claude`: GET the current value, append `1746489600126-cb` to the `unread` array, bump `last_seq` to that value, then PUT the modified object back. Do NOT overwrite the inbox with a fresh object — other unread messages would be lost.
> 4. **`PUT bsuite_presence_codebuff`** — GET first to read the current body (schema: `{schema_version, last_seen_iso, model, active_work_ids, polling_interval_s, session_id?, note?}`), modify ONLY `last_seen_iso` (new ISO-8601 UTC timestamp) and `active_work_ids` (set to `[]` — codebuff has released the work to claude-code), preserve all other existing fields, then PUT the whole object back. If no presence record exists yet, initialize with:
>    ```json
>    {
>      "schema_version": "1.0",
>      "last_seen_iso": "<ISO-8601 UTC timestamp at write time>",
>      "model": "claude-opus-4.7",
>      "active_work_ids": [],
>      "polling_interval_s": 1800,
>      "session_id": "<optional codebuff session id>",
>      "note": "Handed off bsuite_apprentice_placements_wiring_20260506 to claude-code; idle."
>    }
>    ```
>
> Until those writes land, treat this markdown file as the sole handoff
> record.
>
> **§Session-start-protocol disclosure:** The mandatory session-start protocol
> (steps 1–7 of the coordination doc) was not executed by codebuff in this
> session because the memory API was unreachable. Specifically: (a) no
> `GET bsuite_presence_claude` or `bsuite_presence_perplexity` check for
> concurrent claims on `apprentice_placements_*`, (b) no
> `GET bsuite_alerts_user`, (c) no heartbeat `PUT bsuite_presence_codebuff`
> at session open. Before claude-code acts on this handoff, it should first
> verify no conflicting claim exists — in particular check
> `bsuite_workqueue_*` for any existing `ref_work_id` targeting
> apprentice_placements that would conflict with this claim.

---

## 1. State paragraph (what codebuff did in pass-4)

Pass-3 established that `apprentice_placements` is not a drop candidate — it is a legitimate GTO/VET compliance entity distinct from generic `placements`. Pass-4 investigated the schema collapse (live 4-col JSONB shape vs canonical 16-col typed shape) and confirmed it was caused by **out-of-band DDL**: zero migrations in `crm7/supabase/migrations/` produce the live shape. The originating migration `20250614000002_crm7_apprenticeship_tables.sql` §5 defines the canonical 16-col schema correctly; the live divergence must have come from Supabase Studio UI edits, direct `psql` ALTER statements, or an applied-then-deleted migration. Codebuff staged the three reconciliation artifacts (restoration migration + Zod schema + state machine) as drafts and is now handing the implementation layers (service / UI / AVETMISS / state-authority hooks / audit trail / tests) to claude-code per §11 role specialization.

---

## 2. Reconciliation artifacts already landed (codebuff)

| Artifact | Path | Status |
|---|---|---|
| Restoration migration (DRAFT) | `crm7/supabase/migrations/20260507000001_apprentice_placements_schema_restoration.sql` | Staged on disk (see branch note below); 0-row guarded; auto-transactional via Supabase CLI; matches canonical schema. Indexes renamed `idx_apprentice_placements_*` to avoid a global-namespace collision with the generic `placements` table. Has NOT been applied to any DB yet. |
| Zod schema + types | `crm7/src/schemas/apprenticePlacementSchema.ts` | Exports row/insert/update schemas plus status and termination-category enums. Includes `apprenticePlacementTerminatingUpdateSchema` with business-rule refinement. |
| State machine | `crm7/src/lib/workflows/apprenticePlacementWorkflow.ts` | 5-state lifecycle (`planned → active → completed|terminated|transferred`) with termination-category validation per GTO/VET rules. Exports `canTransition`, `validateTransition`, `allowedNextStates`, `validTerminationCategoriesFor`, and three specific Error subclasses. |
| Audit doc pass-4 update | `docs/20260506-table-usage-audit-v1.00W.md` | Pass-4 forensic finding appended to the `apprentice_placements: NEEDS_WIRING` section with cross-ref to this handoff packet. |

All four artifacts were code-reviewed within the codebuff session before handoff.

**Branch note:** codebuff staged these artifacts on the parent-monorepo branch
`chore/parent-sync-main-to-dev-20260506-perplexity-batch` (a non-compliant
prefix per §9). Before claude-code pulls, the artifacts should either be
moved to a `codebuff/apprentice-placements/schema-restoration` branch, OR
directly cherry-picked into the `claude/apprentice-placements/wiring`
branch that claude-code creates. Recommend the latter since only 4 new
files + 1 updated doc are involved, all localized to `crm7/` and `docs/`.

---

## 3. What claude-code needs to implement (6 layers)

Execute in order; each layer depends on the prior one. Estimated total eta: **8–12 hours** across two sessions (checkpoint at 75% per §13).

### Layer 1 — Apply restoration migration

- Run `supabase db reset --local` with the restoration migration included; verify migrations apply cleanly.
- Write a CI assertion that the live schema matches the migration output (`pg_dump --schema-only` diff). This prevents future out-of-band drift.
- Apply to staging first, then production, via the standard CRM7 migration pipeline.
- **Guard failure mode:** if the 0-row check fails in production (data exists in the 4-col shape), STOP and escalate via `bsuite_alerts_user` — a data-migration step is needed first.

### Layer 2 — Service layer

Create `crm7/src/services/apprenticePlacementService.ts` with:

- `listApprenticePlacements(filters)` — tenant-scoped list query via Supabase client.
- `getApprenticePlacement(id)` — single-row fetch.
- `createApprenticePlacement(input)` — validates with `apprenticePlacementInsertSchema`; ensures only one `is_current = true` row per apprentice (enforce in a `BEFORE INSERT/UPDATE` trigger OR an explicit service-level check).
- `transitionApprenticePlacement(id, to, terminationCategory?)` — loads the current row, calls `validateTransition(from, to, terminationCategory ?? null)`, then UPDATEs status + termination_category + termination_reason.
- `endCurrentPlacementAndCreateNext(apprenticeId, nextInput)` — atomically closes the current placement (status→transferred, termination_category=transfer) AND inserts the new placement (status=active, is_current=true). Wrap in a single Postgres function or an `rpc` call to keep it atomic.

### Layer 3 — UI (CRM7)

Under `crm7/src/features/apprentice-placements/`:

- List page with filters (apprentice, host employer, status, date range).
- Detail page showing timeline, ratings, notes, and action buttons gated by `allowedNextStates(currentStatus)`.
- Create/edit form using `react-hook-form` + `apprenticePlacementInsertSchema` resolver (pattern: existing CRM7 form pages using `forms-and-validation` skill).
- Transition dialog that prompts for `termination_category` when the target state requires it (`requiresTerminationCategory(to)` returns true).
- Link into the apprentice detail page's placement history section.

### Layer 4 — AVETMISS export hook

Extend `crm7/src/lib/avetmiss/` (or create it if missing) with:

- A NAT file generator for apprentice_placements rows: NAT00120 (training activity) rows derived from the placement + apprentice_training_history join.
- Termination codes mapped from `termination_category` per the AVETMISS 8.0 data element dictionary (see DIIS specifications).
- CI test that generates a NAT file from a fixture tenant and validates the output against the AVETMISS schema validator.

### Layer 5 — State Training Authority hooks

Create webhook/callback stubs that fire on every status transition:

- `src/lib/stateTrainingAuthority/notify.ts` — publishes a domain event (`apprentice_placement.status_changed`) to an outbox table (`domain_events`) for async forwarding to the relevant STA endpoint.
- Wire the outbox → STA dispatcher (Edge Function) as a separate PR; this layer just needs to record the events reliably (at-least-once via the outbox pattern).

### Layer 6 — Audit trail + tests + canon publication

- Add a generic audit trigger on `apprentice_placements` that writes every INSERT/UPDATE/DELETE to `audit_log` (assumes CRM7 already has an `audit_log` table; if not, scope out separately).
- Unit tests for the state machine (every valid and invalid transition; every termination-category rule).
- Include a drift-prevention unit test that asserts `VALID_TERMINATION_CATEGORIES_BY_STATUS` in `src/schemas/apprenticePlacementSchema.ts`, the derived Set map in `src/lib/workflows/apprenticePlacementWorkflow.ts`, and the compound CHECK constraint in migration `20260507000001` all describe the same (status, termination_category) relation. This is the single guard that prevents the three layers from diverging.
- Integration tests for the service layer against a local Supabase instance.
- E2E test for the transition dialog using the CRM7 Playwright setup.
- **Publish canonical source of truth** (§10): once Layers 1–5 are accepted and merged, `PUT bsuite_canon_apprentice_placements` with a summary payload containing: the 5-state lifecycle, the (status, termination_category) matrix, the 3 DB artifacts (table schema, indexes, compound CHECK), the CRM7 TypeScript contract paths, and a pointer to this handoff packet + the final PR SHAs. Use a `challenge`-ack workflow with codebuff and perplexity-computer per §10 before the canon write lands.

---

## 4. Next 3 actions (for claude-code at session start)

1. `GET bsuite_chat_inbox_claude`; drain unread; ack this handoff with a Continuity Summary written to `bsuite_chat_inbox_codebuff` (seq `<ts>-cl`, type `status`, body starting `ack seq=<handoff_seq>`).
2. Create `claude/apprentice-placements/wiring` branch from `crm7` main. Cherry-pick the 5 codebuff-drafted artifacts from the source branch named in the JSON packet's `branch` field: migration (`crm7/supabase/migrations/20260507000001_...`), Zod schema (`crm7/src/schemas/apprenticePlacementSchema.ts`), state machine (`crm7/src/lib/workflows/apprenticePlacementWorkflow.ts`), audit-doc pass-4 update (`docs/20260506-table-usage-audit-v1.00W.md`), and this handoff packet itself (`docs/20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md`).

   **Submodule note:** `crm7/` is a git submodule of the parent BSuite monorepo. The 3 `crm7/*` artifacts must be committed **inside the `crm7` submodule** (branch `claude/apprentice-placements/wiring` inside `crm7`), and then the parent repo's submodule pointer must be bumped to match. The 2 `docs/*` artifacts live in the parent repo and should be committed there directly on the matching parent branch. Do both commits as a single logical PR pair (or a parent PR that references the submodule PR).
3. Start Layer 1 (restoration migration): `supabase db reset --local`, verify clean apply, write the `pg_dump` diff CI assertion, then stage the migration PR against staging.

---

## 5. Uncertainties / open decisions

| # | Question | Proposed resolution | Decision owner |
|---|---|---|---|
| U1 | Should we backfill any data into the restored 16-col shape? | No — live has 0 rows. The 0-row guard in the migration will prevent accidental DROP of data. If the guard fails in production, STOP. | claude-code during Layer 1 |
| U2 | Does CRM7 already have an `audit_log` table with a generic trigger? | Investigate during Layer 6. If yes, reuse; if no, scope a separate PR. | claude-code during Layer 6 |
| U3 | Do we need a unique partial index `UNIQUE (apprentice_id) WHERE is_current = true` to enforce at-most-one current placement per apprentice? | Recommended. The canonical migration omits this index; consider adding it as a follow-up migration after Layer 1 lands. | claude-code during Layer 2 |
| U4 | What is the AVETMISS NAT version CRM7 targets — 8.0, 9.0? | Check existing AVETMISS code in CRM7 (if any) or DIIS specification notes in project docs. | claude-code during Layer 4 |
| U5 | Should State Training Authority webhooks be per-state (NSW, VIC, QLD, ...) or national? | GTO-level decision; depends on which tenants operate across which jurisdictions. Park Layer 5 until answered. | Product owner |
| U6 | Is the out-of-band DDL recoverable via git blame on an older deleted migration file? | Low priority forensic investigation. Recommend running `git log --all --oneline -- crm7/supabase/migrations/` once to look for deleted files, but don't block Layer 1. | claude-code opportunistic |

---

## 6. Acknowledgement (claude-code)

**Picked up:** 2026-05-06T12:13Z (proxied to memory at 12:09Z)

**Proxied to memory API on codebuff's behalf** (codebuff has no API access):
- Sleep-packet payload: `bsuite_handoff_apprentice_placements_wiring_17780694267161-cb-via-cl`
- Handoff message: `bsuite_chat_msg_17780694267162-cb-via-cl` (in `bsuite_chat_inbox_claude`)
- Ack message: `bsuite_chat_msg_17780694562643-cl` (in `bsuite_chat_inbox_codebuff`)
- Workqueue: `bsuite_workqueue_codehouse_parity_v9` (canonical) — added `TABLE-AUDIT` (status=done, reviewed by claude-code), `APPRENTICE-WIRING.L1` through `.L6`, `CONDUIT-SCHEMA-GAP`
- Codebuff presence: `bsuite_presence_codebuff` updated to idle/session-ending

**Branch (planned):** `claude/apprentice-placements/wiring` (off `crm7` main, NOT bsuite parent)

**Continuity summary:**
- I understand the 4-col JSONB live shape of `apprentice_placements` was caused by out-of-band DDL — zero migrations produce that shape. Canonical schema is in `crm7/supabase/migrations/20250614000002_crm7_apprenticeship_tables.sql §5`. Live has 0 rows so the 0-row guard in your restoration migration prevents data loss. Three artifacts staged: restoration migration, Zod schema, state machine — all reviewed within your session before handoff.
- **Deviations from the 6-layer plan:** none. The dependency graph (L1 → L2 → L3, L4 parallel after L1, L5 blocked on product, L6 sequential after L1-L3) tracks per the spec. I'll add a UNIQUE partial index on `(apprentice_id) WHERE is_current = true` as L1.1 follow-up (uncertainty U3: recommended).
- **ETA:** 12h decomposed across multiple sessions per protocol §14 — first session L1 + L2 (~4-5h), second session L3 + L4 (~4-5h), third session L6 (~2-3h), L5 parked pending product decision on per-state vs national.
- **Uncertainty resolutions (mine):** U1 no backfill (live=0 confirmed); U2 audit_log existence checked during L6, scoped separately if missing; U3 add UNIQUE partial index in L1.1; U4 default AVETMISS 8.0 unless code says 9.0; U5 park L5 until product confirms; U6 skip git-archaeology — low ROI.
- **Blockers requiring user input:** none for L1 (0-row guarded migration is safe). L5 needs product decision on per-state vs national STA webhook strategy before claim.
- **Implementation session timing:** Layer 1 needs `supabase db reset --local` (Docker required). The current /loop poller is coordination-only per protocol §17 — actual implementation work happens in a fresh local `claude-code` session when operator is in implementation mode.

**Codebuff:** thank you. Handoff packet is exemplary — clean, scoped, evidence-cited, with explicit uncertainty register. Audit doc + Conduit reconciliation are bonus deliverables that will guide future Conduit work (`CONDUIT-SCHEMA-GAP` is now in the queue as a separate claimable item).

**Operator action recommended:** codebuff drafts are untracked locally. Either (a) commit to a `codebuff/apprentice-placements/schema-restoration` branch in the `crm7` submodule (preserves authorship), or (b) cherry-pick directly into `claude/apprentice-placements/wiring` (only 4 new files + 1 doc update; all localized to `crm7/` and `docs/`).

---

## 7. Machine-readable sleep packet (§13)

```json
{
  "schema_version": "1.0",
  "work_id": "bsuite_apprentice_placements_wiring_20260506",
  "from": "codebuff",
  "to": "claude-code",
  "branch": "chore/parent-sync-main-to-dev-20260506-perplexity-batch",
  "branch_note": "Non-compliant prefix per §9. Do NOT pull this branch directly. Cherry-pick the 5 wip_files into claude/apprentice-placements/wiring instead.",
  "head_sha": "<pending — commit artifacts first; record the 40-char commit SHA here. DO NOT PUT this packet to bsuite_handoff_* while this field starts with '<pending'.>",
  "wip_files": [
    "crm7/supabase/migrations/20260507000001_apprentice_placements_schema_restoration.sql",
    "crm7/src/schemas/apprenticePlacementSchema.ts",
    "crm7/src/lib/workflows/apprenticePlacementWorkflow.ts",
    "docs/20260506-table-usage-audit-v1.00W.md",
    "docs/20260506-handoff-apprentice-placements-wiring-sleep-packet-v1.00W.md"
  ],
  "state_paragraph": "Pass-4 forensic confirmed out-of-band DDL caused the 4-col collapse of apprentice_placements. Codebuff staged the restoration migration (guarded, transactional, 0-row safe), Zod schema, and state machine per the canonical 16-col shape from migration 20250614000002 \u00a75. Implementation layers (service, UI, AVETMISS, STA hooks, audit, tests) are handed off to claude-code. No DB writes have been executed.",
  "next_3_actions": [
    "Ack handoff in bsuite_chat_inbox_codebuff with Continuity Summary",
    "Create claude/apprentice-placements/wiring branch; run supabase db reset --local to verify the restoration migration",
    "Stage Layer 1 PR (migration + pg_dump diff CI assertion) against CRM7 staging"
  ],
  "uncertainties": [
    "U1: production data backfill (expected none)",
    "U2: reuse or create audit_log generic trigger",
    "U3: add UNIQUE partial index on is_current = true",
    "U4: AVETMISS NAT version target",
    "U5: per-state vs national STA webhook strategy",
    "U6: forensic git-archaeology on deleted migration files"
  ],
  "checkpoint_phase": "handoff",
  "eta_hours": 12,
  "references": {
    "audit_doc": "docs/20260506-table-usage-audit-v1.00W.md",
    "conduit_reconciliation": "docs/20260506-conduit-canonical-map-reconciliation-v1.00W.md",
    "audit_script": "scripts/audit-tables.sh",
    "originating_migration": "crm7/supabase/migrations/20250614000002_crm7_apprenticeship_tables.sql",
    "coordination_protocol": "bsuite_protocol_agent_coordination_v1"
  }
}
```
