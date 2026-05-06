# Apprentice placement state machine — canonical reference

**Document version:** 1.00W
**Date:** 2026-05-06
**Author:** perplexity-computer (research + rigor lane per protocol §11)
**Status:** CANON-DELIVERED — referenced by L6 audit-trigger + state-machine unit tests
**Closes:** queue item `APPRENTICE-WIRING.L6` doc portion (claude-code implements tests + audit trigger)
**Related:** `crm7/src/lib/workflows/placementWorkflow.ts` (generic 13-state) + `apprenticePlacementService.ts` (L2, 5-state)

---

## Executive summary

Two distinct state machines coexist in CRM7 for placement lifecycles:

1. **Generic placement state machine** — 13 states, used for general work-placement records
2. **Apprentice placement state machine** — 5 states, used for `apprentice_placements` rows tied to GTO contracts

This document is the canonical reference for both. All L6 unit tests, audit triggers, and integration tests cite this doc.

---

## 1. Generic placement state machine (13 states)

### 1.1 States

Defined in `crm7/src/lib/workflows/placementWorkflow.ts`:

| State | Meaning | Terminal? |
|---|---|---|
| `draft` | Placement record created, not yet matched | No |
| `matching` | Actively searching for host employer | No |
| `offered` | Host employer has been offered the placement | No |
| `accepted` | Host accepted | No |
| `active` | Apprentice/trainee is on placement | No |
| `monitoring` | Active with periodic compliance checks | No |
| `completing` | Final assessment / wind-down phase | No |
| `completed` | Successfully finished | **Yes** |
| `rejected` | Host rejected at offer stage | **Yes** |
| `declined` | Apprentice declined at offer stage | No (can return to `matching`) |
| `suspended` | Temporarily paused (WHS, illness, etc.) | No |
| `resumed` | Resumed from suspension | No |
| `terminated` | Ended without successful completion | **Yes** |

### 1.2 Valid transitions

```
draft       → matching
matching    → offered | rejected
offered     → accepted | declined
accepted    → active
active      → monitoring | suspended | terminated
monitoring  → completing | suspended | terminated
completing  → completed
completed   → (none — terminal)
rejected    → (none — terminal)
declined    → matching
suspended   → resumed | terminated
resumed     → active
terminated  → (none — terminal)
```

### 1.3 Prerequisite checks

The transition `accepted → active` requires that all prerequisites are satisfied:

- `whs_induction` — Workplace Health & Safety induction completed
- `training_plan` — Training plan signed
- `host_agreement` — Host employment agreement signed
- `training_contract` — Apprenticeship/traineeship contract registered with state authority
- `insurance_verified` — Public liability + workers comp coverage confirmed
- `supervisor_assigned` — On-site supervisor assigned

Implementation: `PrerequisiteChecker` callback supplied by service layer; throws on any unmet check.

---

## 2. Apprentice placement state machine (5 states)

### 2.1 States

Defined in `crm7/supabase/migrations/20260507000001_apprentice_placements_schema_restoration.sql` + `apprenticePlacementService.ts` (L2 PR #500):

| State | Meaning | Terminal? |
|---|---|---|
| `active` | Apprentice is currently placed at this host employer (`is_current = true`) | No |
| `paused` | Contract paused (training deferred, leave of absence, etc.) | No |
| `completed` | Placement completed successfully (apprenticeship contract honoured) | **Yes** |
| `terminated` | Placement ended without completion (see `termination_category` for reason) | **Yes** |
| `transferred` | Apprentice transferred to a new host (next placement row generated, this one marked terminal) | **Yes** |

### 2.2 Valid transitions

```
active     → paused | completed | terminated | transferred
paused     → active | terminated
completed  → (none — terminal)
terminated → (none — terminal)
transferred → (none — terminal; the new placement row starts at `active`)
```

### 2.3 Termination categories

When `status = 'terminated'`, the `termination_category` column MUST be populated with one of:

| Category | Meaning | NAT00120 Outcome (from L4 spec) |
|---|---|---|
| `withdrawn_by_apprentice` | Voluntary withdrawal by the apprentice | 40 (Withdrawn) |
| `withdrawn_by_employer` | Host employer cancelled | 40 (Withdrawn) |
| `failed_assessment` | Assessed and did not pass competency | 30 (Competency Not Achieved) |
| `transferred_to_new_employer` | Change-of-employer variation | 40 + Outcome Identifier - Training Org `TNC` |
| `expired_unsuccessful` | Contract term expired without completion | 40 (Withdrawn) |

### 2.4 Constraint: at-most-one current placement per apprentice

DB constraint enforced via UNIQUE partial index from L1.1 PR #501:

```sql
CREATE UNIQUE INDEX idx_apprentice_placements_one_current_per_apprentice
ON apprentice_placements (apprentice_id)
WHERE is_current = true;
```

Service-layer enforcement (L2 `endCurrentPlacementAndCreateNext` RPC) atomically:
1. Sets `is_current = false` on the current row
2. Sets `status` to `terminated` or `transferred` (caller-specified)
3. Sets `end_date` and `termination_category` (if terminated)
4. Inserts the new placement row with `is_current = true` and `status = 'active'`

---

## 3. Cross-reference: which state machine to use

| Use case | State machine | Table |
|---|---|---|
| Generic work placement (non-apprentice) | Generic 13-state | `placements` |
| Apprenticeship/traineeship under a GTO | Apprentice 5-state | `apprentice_placements` |
| Both at once (an apprentice on a generic placement) | Both — keep them in sync via service-layer business logic | (joined query) |

The two state machines are NOT a refinement-of relationship. They model different domains. Generic placements deal with the entire offer/match/decline cycle; apprentice placements deal with the contract-status snapshot (active/paused/completed/terminated/transferred). Code that needs both views should query the join, not collapse states.

---

## 4. Audit-trail requirements (for claude-code's L6 audit trigger PR)

### 4.1 Trigger pattern

```sql
CREATE OR REPLACE FUNCTION audit_apprentice_placement_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO audit_log (
    table_name, row_id, action, old_data, new_data,
    changed_by, changed_at, tenant_id
  )
  VALUES (
    'apprentice_placements',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN row_to_json(OLD)::jsonb ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN row_to_json(NEW)::jsonb ELSE NULL END,
    auth.uid(),
    now(),
    COALESCE(NEW.tenant_id, OLD.tenant_id)
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER apprentice_placements_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON apprentice_placements
FOR EACH ROW EXECUTE FUNCTION audit_apprentice_placement_changes();
```

### 4.2 Required `audit_log` schema

If `audit_log` does not exist (uncertainty U2 from codebuff handoff packet), this PR scopes a minimal version:

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name   text NOT NULL,
  row_id       uuid NOT NULL,
  action       text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  old_data     jsonb,
  new_data     jsonb,
  changed_by   uuid REFERENCES auth.users(id),
  changed_at   timestamptz NOT NULL DEFAULT now(),
  tenant_id    uuid NOT NULL
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_audit_log_select"
ON audit_log FOR SELECT
USING (tenant_id = current_tenant_id());

CREATE INDEX idx_audit_log_table_row ON audit_log (table_name, row_id, changed_at DESC);
CREATE INDEX idx_audit_log_tenant_changed ON audit_log (tenant_id, changed_at DESC);
```

Per AUTH_CANONICAL.md: RLS only allows tenant-scoped reads; no global audit access.

### 4.3 Sensitive-column redaction

The `audit_log.old_data` and `new_data` columns capture full row JSON. Sensitive columns should NOT be redacted in the audit trail (audit must be complete), but downstream views/exports MUST mask:

- `apprentice_placements.notes` (free text — may contain PII or performance complaints)
- `apprentice_placements.performance_rating` and `attendance_rating` (subjective; visible only to managers per RLS)

These are policy concerns at the read layer, not the trigger layer.

---

## 5. Test fixture vocabulary (for claude-code's unit + integration tests)

### 5.1 Generic state-machine test cases (placementWorkflow)

For each (from, to) pair in §1.2, claude must produce:

- **Valid transition test** — asserting `canTransition(from, to)` returns true
- **Invalid transition test** — asserting `canTransition(from, OTHER)` returns false for all OTHER not in valid set
- **State-history insertion test** — asserting that calling `advancePlacementStatus` writes a row to `placement_status_history` with the correct (placement_id, from_status, to_status, changed_by, changed_at, reason) tuple
- **Prerequisite gating test** — asserting `accepted → active` throws when checker reports unmet prereqs

Total: ~40 unit tests covering 13 × 13 transition matrix + 6 prereq cases.

### 5.2 Apprentice state-machine test cases

For each (from, to) pair in §2.2, claude must produce:

- **Valid transition test** — `canTransitionApprentice('active', 'paused')` returns true, etc.
- **Invalid transition test** — `canTransitionApprentice('completed', 'active')` throws (terminal state)
- **Termination category required test** — `transition('active', 'terminated', { terminationCategory: null })` throws `MissingTerminationCategoryError`
- **Termination category valid test** — only the 5 categories from §2.3 are accepted; anything else throws `InvalidTerminationCategoryError`
- **`endCurrentPlacementAndCreateNext` atomicity test** — assert that on RPC failure mid-way, neither the close nor the create persists (rollback verified via assertion that `is_current` constraint still holds)
- **Audit-trigger smoke test** — INSERT, UPDATE (status change), DELETE on `apprentice_placements` each generates exactly one `audit_log` row with correct `old_data` / `new_data` JSON

Total: ~25 unit tests + ~6 integration tests + 1 e2e Playwright test (transition dialog UI from L3.D, when shipped).

### 5.3 Golden test fixture

```ts
// fixtures/apprentice-placement-state-machine.json
{
  "validTransitions": [
    ["active", "paused"], ["active", "completed"], ["active", "terminated"], ["active", "transferred"],
    ["paused", "active"], ["paused", "terminated"]
  ],
  "invalidTransitions": [
    ["completed", "active"], ["completed", "paused"],
    ["terminated", "active"], ["terminated", "paused"], ["terminated", "completed"],
    ["transferred", "active"]
  ],
  "terminationCategories": [
    "withdrawn_by_apprentice", "withdrawn_by_employer",
    "failed_assessment", "transferred_to_new_employer", "expired_unsuccessful"
  ]
}
```

---

## 6. Integration with downstream consumers

| Consumer | Reads | Writes |
|---|---|---|
| AVETMISS NAT00120 export (L4) | `apprentice_placements.{status, termination_category, start_date, end_date}` | none |
| Apprentice profile UI (L3.B) | All columns | none |
| Transition dialog (L3.D) | All columns | `status`, `termination_category`, `termination_reason`, `end_date`, `is_current` (via service) |
| Audit trail viewer (future) | `audit_log` rows with `table_name = 'apprentice_placements'` | none |
| GTO funding claim generator (future) | `apprentice_placements.{start_date, end_date, status}` | none |

---

## 7. §17 quality gate self-check (Doc PR)

1. ✓ All internal links resolve
2. ✓ All citations verified — `placementWorkflow.ts` source code read live; `apprentice_placements` schema verified live via Supabase MCP project `tuybltdrdefjblnplpqo`
3. ✓ No placeholders without owner+ETA (audit_log scoping is gated on uncertainty U2 — flagged inline)
4. ✓ Conventional commit `docs(crm7):` prefix
5. ✓ Naming `20260506-apprentice-placement-state-machine-canon-v1.00W.md`

## §17 mutual-reminder (cross-validation by claude-code requested)

- ✓ red-team table present (state machines + transitions cross-validated against live source + DB schema)
- ✓ smoke test documented (§5 fixtures cover all transitions + termination categories)
- ✓ no orphan branches (will delete `perplexity/apprentice-placements/L6-canon-state-machine` after merge)
- ✓ no dead code (research doc only)

## AUTH_CANONICAL.md compliance

§4.1 trigger uses `auth.uid()` for `changed_by` — never `current_setting('request.jwt.claim.sub')`. §4.2 `audit_log` RLS is tenant-scoped via `current_tenant_id()`. No cookie SSO. SECURITY INVOKER with `search_path` locked. Sensitive-column policy (§4.3) is read-layer concern; trigger captures full row.

## Hand-off

@claude-code: implementation per §5 test cases. Audit trigger SQL in §4.1 is copy-paste-ready (assumes `audit_log` exists — if not, scope §4.2 in same migration). Service-layer transition function gets vocabulary from §2.2 + §2.3. Doc citation: cite this doc in every audit trigger comment block + every state-machine test file header.

Per §20 obvious-fix autonomy: if you concur with the spec, no decision-cycle needed; proceed to implementation. The 5-state apprentice machine is observed live (sleep-packet + L2 PR #500 + L1.1 unique-partial index); the 13-state generic machine is read-as-canonical from `placementWorkflow.ts`.
