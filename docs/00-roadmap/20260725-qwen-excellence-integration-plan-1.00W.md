# Qwen excellence integration plan (post impl-RT)

> ## ⚠ SUPERSEDED — 2026-08-17
>
> **Do not execute this plan.** Its target application, **R80.3**, left the submodule set on
> 2026-08-06 (`5e000c35`, operator directive) and was replaced by **R80.4** — a different codebase.
> Every R80.3 work item here is aimed at a repository this monorepo no longer builds or deploys.
>
> **Current authority:** [`../20260814-estate-remaining-work-register-v2.00W.md`](../20260814-estate-remaining-work-register-v2.00W.md).
>
> Retained as the record of what the 2026-07-25 excellence loop decided and shipped. If you need an
> item from here, re-measure it against R80.4 first — do not assume it carries over.


> Status **W** · 2026-07-25  
> Generated via **`qwen -m qwen3.8-max-preview`** (Bailian token plan; user asked `qwen3.8-preview` — that id is not in settings; max-preview is the configured high-end model)  
> Input: excellence close-out + RT batches `deleg_aaed0109` / `deleg_ae77b2a4`  
> **This edition is the tool-verified Qwen output** (cross-checked ALLOWED_TABLES, perms, funding schema).

**Anchor (verified from code, not memory):**
- Real perms (`crm7/src/hooks/usePermissions.ts`): `manage_system`, `manage_organizations`, `manage_financial`. **`manage_tenants` does not exist**.
- `crm7/api/db/[...path].ts` `ALLOWED_TABLES` has **no `tenants` / `tenant_features`**. **No `crm7/api/rpc/*` exists**.
- `create_organization_with_owner` = SECDEF, **no `parent_tenant_id` param**.
- Feature-flag SoT = **`tenant_settings.feature_flags` JSONB**, not `tenant_features.module`.
- `resolveSchemeAmount` shipped (amountWindows + AU/Sydney + strict ISO). `apply_funding_offset` still trusts caller amount; gate is **`aiLicensed` only**.
- `funding_offsets`: **NO `UNIQUE(placement_id, scheme)`**.
- `@bsuite/ui@1.0.1` published with `sanitizeCustomCss`. Apps pin `^0.6.0` (braden has no dep). Dual local sanitize in crm7 + BSU.

## Workstreams

| WS | Repo | Depends | Binary acceptance |
|----|------|---------|-------------------|
| **W1** Funding money-integrity | R80.3 | — | UNIQUE live; 2nd apply no dup; resolver bound; manage_financial gate |
| **W2** Enterprise Jodie — read-only | crm7 | — | `list_enterprise_sub_orgs` registered; membership-scoped; cross-tenant deny |
| **W3** Enterprise Jodie — atomic sub-org create | crm7 + shared DB | W2 | `create_sub_organization` SECDEF parent check inside fn; `/api/rpc` allowlist-only; tool wired |
| **W4** `@bsuite/ui` pin train | BSU→crm7→R80→conduit→throughput | publish done | each `^1.0.1` + isolated lockfile; crm7+BSU re-export sanitize |
| **W5** Truth hygiene | parent | W2/W3 | parity matrix honest |
| **W6** Manuals how-to | BSU | W2/W3 ship | askJodie strings match tools |

## THIS sprint vs DEFER

**Sprint:** W1–W6.  
**DEFER:**
- `set_tenant_feature_flag` via Jodie (feature migration via chat — keep NOT_IMPLEMENTED)
- Sydney cutover; STA PROVEN promotion
- CSS adversarial allowlist beyond denylist; mass auth_rls_initplan (#1542)

## Enterprise Jodie — staged thinner wire (recommended)

Full 3-tool wire is **not** recommended. Stage:
1. **W2:** allowlist `tenants` in `/api/db`; register **list only**
2. **W3:** atomic `create_sub_organization` SECDEF + narrow `/api/rpc` + wire create tool
3. **Never** register feature-flag tool this sprint

## W1 — Funding money-integrity (R80.3)

1. Dedupe then `UNIQUE (placement_id, scheme)` (or include tenant_id if needed)
2. Bind `resolveSchemeAmount` in tool for known schemes
3. Gate on financial permission / `canManageFinancial`
4. Upsert on conflict

## W4 — Pin train

Order: **BSU → crm7 → R80.3 → conduit → throughput**. Isolated lockfile outside monorepo tree. Then re-export sanitize from package in crm7+BSU.

## PR split

1. R80.3 W1  
2. crm7 W2  
3. crm7 W3 (after W2)  
4. Pin train per app  
5. parent W5 + BSU W6  

## Risks + kill criteria

| Risk | Kill |
|------|------|
| W3 SECDEF wrong parent check | Halt W3; do not register |
| W1 dedupe drops legit rows | Halt; redesign |
| Lockfile `..` importer | Reject lockfile |
| `/api/rpc` broad allowlist | Reject PR |
| Resolver silent override | Surface diff to user |

## Doctrine

publish-before-pin · no set_current_tenant tool · no feature-migration-via-chat · no Sydney/STA promotion · RLS SETOF
