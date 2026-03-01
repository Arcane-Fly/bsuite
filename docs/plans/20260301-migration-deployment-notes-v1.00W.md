# Migration Deployment Notes — Production Reconciliation

> **Status:** v1.00W (Working)
> **Date:** 2026-03-01
> **Author:** Claude Code
> **Context:** Wave 4.6 of BSuite Production Reconciliation

---

## Overview

This document covers 57 migrations in `crm7/supabase/migrations/` that need to be applied to the production Supabase project. All migrations use the **Expand** pattern (additive only — no drops, no renames, no destructive changes).

---

## Migration Run Order

Supabase CLI applies migrations in **alphabetical filename order**. The timestamps ensure correct sequencing:

### Phase 1: Foundation (pre-2026)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 1 | `20250601_crm7_core_schema.sql` | Core CRM tables (contacts, clients, deals, etc.) | Manual review — foundation schema |
| 2 | `20250610_enhanced_user_profiles.sql` | Profile enhancements | |
| 3 | `20250614_business_suite_shared_entities.sql` | Shared entity definitions | |
| 4 | `20250614_business_suite_unified_core.sql` | BSU core tables | |
| 5 | `20250614_crm7_apprenticeship_tables.sql` | Apprenticeship management | |
| 6 | `20250615_apprenticeship_management.sql` | Extended apprenticeship features | |
| 7 | `20251014093253_20250614_business_suite_unified_core.sql` | BSU core revision | Manual review — overlapping name with #4 |
| 8 | `20251015024942_crm7_core_organizations_awards.sql` | Organizations + awards | |
| 9 | `20251015025032_crm7_fix_role_function.sql` | Role function fix | |
| 10 | `20251015025100_crm7_whs_workflow_reporting_v2.sql` | WHS workflows + reporting | |

### Phase 2: Security & Admin (2026-02-26/27)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 11 | `20260226_add_crm_core_tables.sql` | Additional CRM tables | |
| 12 | `20260226_add_dev_mode_toggle.sql` | Developer mode toggle | |
| 13 | `20260226_create_document_storage.sql` | Document storage | |
| 14 | `20260226_create_super_admin_system.sql` | Super admin | Manual review — elevated privileges |
| 15 | `20260226_fix_rls_infinite_recursion.sql` | RLS recursion fix | Manual review — security fix |
| 16 | `20260226_setup_developer_account.sql` | Developer account seeding | Manual review — seeds data |
| 17 | `20260227_add_portal_role_to_user_tenants.sql` | Portal role column | |
| 18 | `20260227_fix_privilege_escalation.sql` | Privilege escalation fix | Manual review — security fix |
| 19 | `20260227_platform_developer_role_system.sql` | Platform developer roles | Manual review — role system |
| 20 | `20260227_sec004_rls_role_validation.sql` | RLS role validation | Manual review — security |
| 21 | `20260227_tenant_encryption_keys.sql` | Tenant encryption keys | Manual review — crypto |

### Phase 3: Financial Pipeline (2026-02-28 12xxxx)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 22 | `20260228120000_create_quotes.sql` | Quote management | |
| 23 | `20260228120100_create_billing.sql` | Billing records | |
| 24 | `20260228120200_create_leave.sql` | Leave management | |
| 25 | `20260228120300_alter_timesheets_approval.sql` | Timesheet approval workflow | |
| 26 | `20260228120400_create_payroll.sql` | Payroll records | |

### Phase 4: Compliance & Training (2026-02-28 13xxxx)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 27 | `20260228130000_create_compliance_alerts.sql` | Compliance alert engine | |
| 28 | `20260228130100_create_contract_variations.sql` | Contract variations | |
| 29 | `20260228130200_create_audit_trail.sql` | Audit trail | Manual review — audit logging |
| 30 | `20260228130300_create_performance_reviews.sql` | Performance reviews | |
| 31 | `20260228130400_create_rtw.sql` | Right to work checks | |
| 32 | `20260228130500_enhance_competency_tracking.sql` | Competency tracking | |
| 33 | `20260228130600_fix_stream_b_final_review.sql` | Stream B final fixes | |

### Phase 5: Communications & BOOT (2026-02-28 14xxxx)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 34 | `20260228140000_create_communications.sql` | Communications system | |
| 35 | `20260228140001_create_placement_status_history.sql` | Placement status history | Renamed from 140000 to fix collision |
| 36 | `20260228140100_create_boot_assessments.sql` | BOOT assessment tracking | Manual review — compliance-critical |

### Phase 6: Streams C/D + GTO (2026-02-28 15-17xxxx)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 37 | `20260228150000_create_streams_c4_d6.sql` | Streams C4 + D6 tables | |
| 38 | `20260228160000_create_gto_risks.sql` | GTO risk management | |
| 39 | `20260228170000_create_vet_assessments.sql` | VET assessments | |
| 40 | `20260228170100_create_training_packages.sql` | Training packages | |
| 41 | `20260228170200_create_host_agreements.sql` | Host agreements | |
| 42 | `20260228170300_create_apprentice_completions.sql` | Apprentice completions | |
| 43 | `20260228170400_create_gto_records.sql` | GTO records | |

### Phase 7: Dedup + Rates (2026-02-28 18-21xxxx)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 44 | `20260228180000_add_compliance_alerts_dedup_key.sql` | Dedup key for alerts | |
| 45 | `20260228200000_create_rate_schedules.sql` | Rate schedules | |
| 46 | `20260228210000_create_award_rate_cache.sql` | Award rate caching | |

### Phase 8: GTO Foundation (2026-02-28 non-timestamped)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 47 | `20260228_ensure_apprentice_gto_fields.sql` | GTO fields on apprentices | |
| 48 | `20260228_gto_foundation_tables.sql` | GTO foundation | |

### Phase 9: Wave 1 Entity Tables (2026-03-01)
| # | Migration | Purpose | Review? |
|---|-----------|---------|---------|
| 49 | `20260301100000_create_vacancies.sql` | Vacancy/job postings | |
| 50 | `20260301100100_create_workers.sql` | Worker records | |
| 51 | `20260301100200_create_host_sites.sql` | Physical workplace sites | |
| 52 | `20260301100300_create_leads.sql` | CRM leads with scoring | |
| 53 | `20260301100400_create_funding_sources.sql` | Funding sources | |
| 54 | `20260301100500_create_funding_claims.sql` | Funding claims lifecycle | Manual review — 35+ columns, AU compliance |
| 55 | `20260301100600_create_gto_organizations.sql` | GTO organizations | |
| 56 | `20260301100700_create_gto_complaints.sql` | GTO complaints | |
| 57 | `20260301100800_create_charge_rate_quotes.sql` | Charge rate quotes | |

---

## Security Verification

All tables created in this reconciliation follow the standard pattern:

- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `tenant_id UUID` with RLS tenant isolation policy
- Row Level Security **ENABLED** on every table
- Tenant isolation via `user_tenants` join: `tenant_id IN (SELECT ut.tenant_id FROM public.user_tenants ut WHERE ut.user_id = auth.uid())`
- Indexes on `tenant_id`, status columns, and foreign keys

---

## Known Issues

1. **Migration #7 naming overlap**: `20251014093253_20250614_business_suite_unified_core.sql` contains a date reference to an earlier migration (#4). Runs after it due to the `20251014` prefix. No functional issue.

2. **Non-timestamped migrations (#47-48)**: `20260228_ensure_apprentice_gto_fields.sql` and `20260228_gto_foundation_tables.sql` lack hour/minute/second timestamps. They sort after the timestamped `20260228*` migrations due to `_e` and `_g` sorting after digits. No functional issue.

3. **Collision fix (#35)**: `create_placement_status_history.sql` was renamed from `20260228140000` to `20260228140001` to avoid collision with `create_communications.sql`.

---

## Pre-Deployment Checklist

- [ ] Run `supabase db diff` to verify no drift between local and remote
- [ ] Back up production database before applying
- [ ] Apply migrations in a staging environment first
- [ ] Verify all 57 migrations apply cleanly in sequence
- [ ] Spot-check RLS policies on new tables (vacancies, workers, host_sites, leads, funding_sources, funding_claims)
- [ ] Verify `user_tenants` join table exists and is populated
- [ ] Rotate any credentials flagged in security scan (.env.local)

---

## Expand → Migrate → Contract Pattern

All migrations in this batch are **Expand** phase only:
- New tables added (no existing tables modified destructively)
- New columns added with DEFAULT values
- New indexes created
- New RLS policies created

**No Contract phase needed** — there are no deprecated columns or tables to remove in this batch.
