---
kind: record
authority: none
owner: bsuite
---

# feat(host-employers): auto-populate ABN + remove dup field + multi-site model (host_employer_sites)

https://github.com/GaryOcean428/crm7/issues/660

Snapshot updatedAt: 2026-05-12T03:30:32Z. Open at capture; re-read live.

## Scope

The host employer step of the `/people/new` wizard currently has **two parallel ABN inputs** (`employer_abn` + `host_employer_abn (override)`) with no auto-populate from the selected host. The override field has no consumer in the codebase — it's a dead UI element. Worse, the data model uses a single FK `current_host_employer_id`, so apprentice rotation across **a single host's multiple worksites** (which is core GTO behaviour, not optional) cannot be represented. `host_employers.site_details` exists as a JSONB blob with no UI.

## Regulatory + operational anchors

- **reference GTO T&C — Agreement Details**: Host Employer must record "Legal Name, Trading Name, ABN/ACN, Address" — single canonical ABN per host. No override needed because the host is already selected by FK.
- **reference GTO T&C §p.5** + **GTO Host Employer Handbook §Site Induction**: per-site Insurance certificate, Industry classification, Supervision Ratio, WHS Assessment must be captured.
- **GTO Handbook §Rotation**: "Rotations are a key aspect of GTOs… apprentices should be exposed to all facets of the trade." A rotation can be inter-host OR intra-host (same host, different worksite). The current model only supports inter-host.
- **GTO National Standards 2017, Standard 2.3** (workplace monitoring): SDC visits are per-site, not per-host. Field officer schedule must route to the actual worksite.
- **WA Electrical Worker Supervision Guide**: max 4 apprentices per supervisor — supervision ratio is **per site**, not per host. The current model cannot enforce this.

## Acceptance criteria

1. Remove `host_employer_abn (override)` field from `src/pages/people/new.tsx` AND from any schema/DB column it was wired to (search: `host_employer_abn`, `employer_abn_override`).
2. When the operator selects a host via `EmployerSelector`, **auto-populate** the read-only ABN display from `host_employers.abn`. No editable override.
3. New migration `host_employer_sites`:
   ```sql
   CREATE TABLE host_employer_sites (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     tenant_id uuid NOT NULL REFERENCES tenants(id),
     host_employer_id uuid NOT NULL REFERENCES host_employers(id) ON DELETE CASCADE,
     site_kind text NOT NULL CHECK (site_kind IN ('head_office','worksite','remote','client_site')),
     site_name text NOT NULL,
     address_line1 text,
     address_line2 text,
     suburb text,
     state text CHECK (state IN ('WA','SA','QLD','VIC','NSW','TAS','NT','ACT')),
     postcode text,
     primary_contact_id uuid REFERENCES contacts(id),
     supervisor_id uuid REFERENCES contacts(id),
     supervision_ratio_apprentice_to_supervisor int CHECK (supervision_ratio_apprentice_to_supervisor BETWEEN 1 AND 10),
     industry_anzsic text,
     whs_assessment_completed_at timestamptz,
     whs_assessment_renewed_at timestamptz,
     whs_assessment_expires_at timestamptz,
     insurance_certificate_url text,
     insurance_expires_at timestamptz,
     active boolean NOT NULL DEFAULT true,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   );
   ```
4. RLS: `tenant_id = current_tenant_id()`. Storage RLS path for insurance certs: `host-employer-documents/{tenant_id}/{host_employer_id}/sites/{site_id}/insurance/{filename}`.
5. Backfill: for every existing `host_employers` row with `site_details` JSONB, create a single `head_office` row in `host_employer_sites`. Migration must be idempotent.
6. Wizard adds a **site selector** below the host selector when the chosen host has >1 active site. Sets `placement.host_employer_site_id` on the apprentice record.
7. New column on apprentice/placement: `host_employer_site_id uuid REFERENCES host_employer_sites(id)` (nullable for legacy rows; required for new intakes).
8. Host detail page (`src/pages/host-employers/[id].tsx` or equivalent) gets a "Sites" tab listing all rows with edit/disable.
9. Field officer schedule UI joins on `host_employer_site_id` not `host_employer_id`.
10. Playwright test: create host → add 2 sites → create apprentice → site selector visible and required → submit → apprentice row has correct `host_employer_site_id`.

## Files touched (estimate)

- `supabase/migrations/2026XXXX_host_employer_sites.sql` (new)
- `supabase/migrations/2026XXXX_host_employer_sites_rls.sql` (new)
- `supabase/migrations/2026XXXX_backfill_head_office_sites.sql` (new)
- `supabase/migrations/2026XXXX_drop_employer_abn_override.sql` (new)
- `src/pages/people/new.tsx` (host step rewrite)
- `src/components/entity/selectors/EmployerSelector.tsx` (return full host object including abn)
- `src/components/entity/selectors/HostEmployerSiteSelector.tsx` (new)
- `src/pages/host-employers/[id].tsx` (sites tab)
- `src/pages/field-officer/schedule.tsx` (join change)

## Brand system clause (MANDATORY)

All UI changes MUST use oklch + semantic tokens only per the `bsuite-brand-system` skill (D2C Neon Electric for CRM7). No inline hex codes. No hardcoded colours.

## Branch policy (MANDATORY)

Target branch for your PR MUST be `development`, not `main`. Per the `ship-all-apps` workflow, all feature work merges to `development` first.

## Deps / blockers

- Depends on issue #1 (form state foundation).
- Issue #6 (R8 charge engine) reads `host_employer_site_id` once this lands.

## References

- `src/pages/people/new.tsx` host step — currently two ABN inputs
- `host_employers.site_details` (JSONB, unused by UI)
- Inventory: the audit inventory notes §3
