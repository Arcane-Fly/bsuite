# Product Tails — Continuation Prompt (2026-06-17)

> **Status: W (Working handoff).** Continuation prompt for the remaining BSuite product-tail features after the document-storage lane shipped + closed. Hand this to a fresh autonomous session.

---

## Verified state at handoff (do not redo)

- **Document storage Phase 1/2/3 — COMPLETE + CLOSED.** crm7#1056/#1057/#1058 closed 2026-06-17. UI (`DocumentHub`, entity hubs, compliance dashboard, self-service portal) + 4 floor-gated migrations (`20260617120000`–`120300`: access-log, role-aware self-service RLS, per-threshold expiry sweep + daily pg_cron, verify notifications) applied + verified live; advisors clean; **live-verified signed-in on d.crm.crm7.app**. PR crm7#1085, parent bsuite#1537/#1538/#1539.
- **bsuite#1505:** row **1.4 = N/A** (live audit: no Custom Access Token Hook configured); **§4.1 Zod 4 format sweep merged** across all 5 apps (crm7#1086, throughput#226, conduit#318, BSU#545, braden#328). ~432/436 occurrences; ~4 `z.string().trim().url()` intermediate-chain forms in crm7 intentionally left (converting reorders trim-before-validate).
- **crm7#534** (training-plan-progress report) — verified (tests 4/4 + acceptance coverage + 3 RLS surfaces) + **CLOSED**.
- **conduit#251** (inline status change) — built (`DropdownMenuSub` + "Move to →" submenu) + shipped (#319) + **CLOSED**.
- Dashboard `document_storage_status`=done + `product_tails_status` roadmap live.

## Canonical decisions to bake into all remaining work

1. **E-signature is IN-HOUSE — no third-party signing vendor** (no Adobe Sign / DocuSign / Secured Signing / HelloSign). Reuse the crm7 architecture: `documentSigner.ts` (pdf-lib + `crypto.subtle` SHA-256, AU ETA 1999 Certificate of Completion) + `SignDocumentFlow.tsx` + `react-pdf` + `@xyflow/react` multi-signer flow + `document_audit_logs`. Canonical doc: `crm7/docs/20260317-document-esigning-architecture-v1.00A.md`. Parent spec corrected: `docs/20260506-integrations-parity-spec-v1.00W.md` §5.
2. **AASN API = RAMS.** The regulated AASN training-contract lodgement API is **RAMS** (supersedes "TYIMS/AASN"). RAMS lodgement is a separate regulated step performed AFTER in-house e-signature — it is NOT a signing vendor. (Acronym note: "RAMS" is also the ADR-0005 `rams_funding_matrix`; consistent — that matrix derives from the AASN/RAMS system.) Apply to conduit#227's lodgement step + any crm7/R80.3 funding-derivation work.
3. **DRY one-shot:** CRM7 owns apprentice/training/document/business entities; reader apps (conduit, R80.3, portals) read/link — no mirror tables, no duplicated entity forms. `docs/20260227-dry-one-shot-architecture-v1.04A.md`.

---

## Remaining work — per-issue scope (from 2026-06-17 scoping pass)

Sizes: **S** ≤1 focused PR · **M** multi-file + table/UI/service · **L** schema + RLS + multi-surface/cross-app.

### CRM7
| Issue | Size | State | Approach | Blockers | DB |
|---|---|---|---|---|---|
| crm7#661 RTO unify + non-TGA inline-create + multi-state portal | L | partial (`RtoLookup.tsx`, `trainingProviderStore.ts`, `tga-organisation-sync` edge fn exist; not cron-registered; no non-TGA create) | Unify name columns → canonical `name`+`legal_name`; non-TGA inline-create dialog; register TGA sync cron; multi-state portal last | TGA API key; #662 depends on this | yes (column consolidation + `non_tga` flag + state join) |
| crm7#662 units of competency assign + competency wage progression | L | partial (`UnitOfCompetencySelector.tsx`, `qualification_units`, TGA-seeded `units_of_competency` exist; no assign-to-period UI / progression tracker) | Wire `TrainingPlanUnitsEditor` into training-plan detail; core/elective/sequence UI; link UoC→training periods; progression tracker from `competency_records` | needs #661 data; shares training-plan data with #534 (done) | maybe (`training_period_units` link table) |
| crm7#530 host monthly invoice+timesheet+progress PDF pack (G4) | M | partial (UI trigger `host-reports.tsx` + `queue_host_monthly_pack` + `report-delivery` edge fn + `renderInvoicePdf.ts` exist) | Gap is inside `report-delivery`: consolidated pack builder (timesheet rows + training summary + outstanding items) + multi-section PDF template | none (self-contained) | no (verify `report_deliveries` exists) |

### Conduit (Next.js 16 App Router, r7_* tables; chain order matters)
| Issue | Size | State | Approach | Blockers | DB |
|---|---|---|---|---|---|
| conduit#219 candidate schema (APP consents, working rights, EIS demographics, AEP licences/vax) | M | none | Expand `r7_candidates` (working_rights enum, dob, address jsonb, consent flags, licence/vax arrays) + Zod + entities + form wizard step | privacy-copy approval (content, not code) | yes (column expansion) |
| conduit#218 public in-portal apply + anon capture + dup detection | M/L | none (ApplyCta is dead-end) | Multi-step apply under `portal/careers/[jobId]` + Server Action insert to `r7_applications` (anon/auth) + duplicate query + **anon-insert RLS + rate-limit** | needs #219; CAPTCHA/rate-limit decision | yes (anon-insert policy) |
| conduit#231 expand conduit→crm7 handoff snapshot | S | partial (`createApprenticeHandoffToken` 8-field allowlist) | Expand `ALLOWED_SNAPSHOT_KEYS` once #219 lands; add tests per field | needs #219 | no |
| conduit#225 FO assignment + workplace-visit + 3-way calendar invites | M | partial (`calendarInvite.ts`, migration `20260610300000` add `field_officer_id`) | Verify migration applied; FO picker in interview form; calendar-invite send; `workplace_visit` guard | calendar/email API config; `field_officers` owned by CRM7 (cross-app read) | migration exists (confirm applied) |
| conduit#229 talent pool consent + opt-in + re-engagement matching | M | partial (`r7_talent_pools`, `r7_candidate_pool_memberships`, store, UI exist) | Add `consent_to_pool`+`consent_at` migration; consent opt-in on rejection; re-engagement email; matching query (trade+region+qual) | APP 6 consent copy (legal) | yes (consent columns) |
| conduit#252 saved views (per-user pinned filters) | M | none (URL filter state exists) | New `r7_saved_views(name, filter_url, owner_user_id, tenant_id)` + CRUD server actions + sidebar switcher + set-default | none | yes (new table, RLS tenant+owner) |
| conduit#221 stage-transition automation engine | L | none (`auto_actions` column exists, nothing reads it) | New `stage-automation` edge fn fired by DB trigger on `r7_pipeline_entries.stage_id`; parse `auto_actions`; email/SMS; log `r7_communications`; idempotency | SMS provider; edge deploy | yes (DB trigger) |
| conduit#227 offer→training-contract e-sign loop + RAMS lodgement | L | partial (`OfferProgressDialog.tsx`, `r7_offers`, xyflow installed; **already corrected to in-house e-sign 2026-05-12**) | **In-house e-sign only** (reuse crm7 `documentSigner.ts`/`SignDocumentFlow.tsx`/xyflow; `esign_flow_id`, no vendor/webhook). Offer-letter + training-contract PDF gen; 3-signer order (candidate→host→recruiter); then **RAMS** lodgement (the AASN API). | RAMS API access; remove the residual "if a vendor is ever re-introduced (DocuSign/HelloSign)" hedge in the issue body | yes (`r7_offers` status CHECK + signature audit) |

### R80.3
| Issue | Size | State | Approach | Blockers | DB |
|---|---|---|---|---|---|
| R80.3#234 payroll exports — STP Phase 2 + super-fund + ABA | M | partial (CRM7 has full `src/lib/stp/phase2/`; R80.3 lacks export service) | Port/share CRM7 STP Phase 2 builder; ABA + SuperStream generators (pure fns, well-specified); per-pay-run export UI | CRM7 STP lib — copy or publish as `@bsuite/stp`; Payday Super (#173/PR#230) merged first | no (file gen only) |
| R80.3#233 GTO invoicing — invoice runs from charge calcs | L | none (`chargeCalculationsService.ts`, `pdfExportService.ts` exist) | `invoicingService.generateInvoiceRun()` from `charge_calculations`; billing-model rules (Standard/ALEX/52W); `invoices`+`invoice_line_items` tables; list/detail UI; PDF | billing-model types need operator confirm; #234 proves export pipeline first | yes (new tables) |

### bsuite#1505 remainder
- **§4.2** `z.discriminatedUnion()` for tagged unions (per-schema, start `apprentice_handoff_tokens.kind`).
- **§4.3** move duplicated schemas into `packages/schema-registry`.
- **§4.4** `safeParse` trust-boundary audit (priority: conduit/R80.3/braden = 0 call sites today).
- **§1.5** production SMTP — **operator dashboard action** (add to `operator_blockers`).
- **§4.1 tail** ~4 `z.string().trim().url()` forms in crm7 (leave, or convert carefully preserving trim-before-validate).

---

## Recommended order (tractable + dependency-aware)

1. **R80.3#234** (M, no DB, reuse CRM7 STP) → then **R80.3#233** (L, needs #234 pipeline).
2. **conduit#252** (M, clean, no deps) — quick win.
3. **conduit#219** → **#218** → **#231** (linear chain: schema → capture → handoff).
4. **conduit#225** (verify migration applied first), **#229** (needs consent copy).
5. **crm7#530** (M, self-contained PDF pack).
6. **crm7#661** → **#662** (RTO data before units UI).
7. **conduit#221** (L automation engine), **conduit#227** (L offer e-sign + RAMS) — write a focused plan each before touching.
8. **bsuite#1505 §4.2/4.3/4.4**; file §1.5 as operator blocker.
9. **Promote dev→main** via `ship-all-apps` once each verified lane is live-checked on d.*.

---

## Hard rules (unchanged)

- Start on `development`; feature PRs target `development`; promote `development`→`main` only after dev deploys green + live d.* verify + docs/dashboard/issues updated + ship-all-apps gates pass. Never push protected branches.
- Never `workspace:*` / `file:../packages/*` in deployable app manifests; regenerate lockfiles **outside** the bsuite tree.
- No service-role / `SBP_MGMT_TOKEN` in browser; virus-scan / management-token ops server/edge/CI only; SECURITY DEFINER fns pin `search_path` + `REVOKE EXECUTE FROM anon`(+`authenticated` if system-only).
- Follow `AUTH_CANONICAL.md` (BS OAuth 2.1 PKCE + JWKS; no cookie SSO).
- DB changes = floor-gated migration (≥ `MIGRATION_FLOOR` `20260611000000`) validated by pgTAP baseline-replay; verify live via Supabase MCP (`pg_policies`, catalogs) — never trust dashboard counters; run `get_advisors` after schema sessions.
- §12.3 live UX gate: signed-in d.* evidence for user-facing changes. Test creds available from operator (do not commit/log them).

## Skills / MCPs

`master-orchestration`, `executing-plans`, `dispatching-parallel-agents`, `supabase` + `supabase-postgres-best-practices`, `security-audit`, `dry-one-shot-architecture`, `forms-and-validation`, `nextjs-app-router` (conduit), `frontend-backend-mapping`, `qa-and-verification`, `verification-before-completion`, `playwright`/`chrome-devtools` (or Browserbase) for d.* live verify, `git-workflow`, `ship-all-apps`, `documentation-compliance`, `bsuite-brand-system`/`ui-ux-consistency`, `data-export` (PDF/STP). MCPs: GitHub/`gh`, Supabase, Vercel, Context7 (before any new lib/upload/PDF/forms pattern), Next.js MCP (conduit), Tavily (RAMS/AASN/STP2/ABA/SuperStream regulatory specs). **Use lower-tier models (haiku/sonnet) for scoped/mechanical subagent work.**

## Mandatory before merge (FF-SELF-VALIDATION-20260507)

Every PR carries the `## Evidence` block (output-equiv / visual-equiv / self-report / tests-run / live-verify). Issues close only with deployed signed-in d.* evidence (§12.3). Update docs/dashboard/STATUS + close the tracked issue in the same cycle.
