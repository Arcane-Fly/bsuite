---
kind: record
authority: none
owner: bsuite-lane
verdict: dead
---

> # ⛔ VERDICT: DEAD — superseded design for a rejected vendor
>
> **Verdicted 2026-08-17 against live code and the live production database.**
>
> This is the design specification for the Adobe Acrobat Sign build described in
> [`20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md`](./20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md).
> **Adobe Sign was rejected on 2026-03-04, the day both documents were written.** Neither was
> revised.
>
> **Current truth:** [`20260317-document-esigning-architecture-v1.00A.md`](./20260317-document-esigning-architecture-v1.00A.md)
> — self-hosted, zero vendor dependency, shipped.
>
> Retained for the requirements and the 20 GTO document types it enumerates, which are still
> accurate. **The architecture, the vendor and the table shapes are not.**
>
<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED
>
> This is the design spec paired with the **rejected-vendor implementation plan** in this same
> directory. It describes the 2026-03-04 Adobe-era shape (7-state status, separate signatory
> table, `adobe_agreement_id`).
>
> **Superseded by** `20260317-document-esigning-architecture-v1.00A.md` (self-hosted signing) for
> the signing model, and by `docs/references/20260730-gto-enquiry-to-billing-process-flow-v1.00D.md`
> §2.4a for the template substrate.
>
> Its statement of the *problem* remains accurate and useful — CRM7 had zero functional document
> generation, PDF buttons were stubs. Its statement of the *solution* names a rejected vendor.
> Live tracking: `crm7#1476` and `crm7#1595`.

---

# CRM7 Document Lifecycle System — Design Specification

**Status:** D (Draft) · **Version:** 1.00 · **Date:** 2026-03-04
**Author:** Braden + Claude Code
**Related Plans:** `20260304-crm7-document-lifecycle-implementation-plan-v1.00F.md`

---

## Executive Summary

CRM7 currently has zero functional document generation. PDF export buttons are stubs (`() => {}`), document upload is URL-paste only, and the `signatureRequestStore` has DocuSign types but zero API integration. The 14 Supabase Storage buckets defined in `documentService.ts` are unwired.

This design closes that gap with a **four-layer architecture** using tools already licensed or open-source:

| Layer | Tool | Cost | Role |
|-------|------|------|------|
| Template Authoring | Google Docs API | $0 (existing Workspace) | Org admins edit contract templates collaboratively |
| In-App Editing | Plate.js | $0 (MIT) | Case notes, field reports — stay in CRM7 |
| PDF Generation | Google Drive API + pdf-lib | $0 | Merge → export; fill govt forms |
| E-Signatures | Adobe Acrobat Sign REST v6 | $0 (existing license + API access) | Multi-party signing, audit trail, webhooks |
| Document Storage | Supabase Storage | $0 (existing) | Private buckets, RLS-scoped |

---

## 1. Domain Context

### What GTOs Generate

From analysis of 20 real GTO documents (anonymised from IntoWork/MRAEL):

| Category | Count | Key Documents |
|----------|-------|---------------|
| **A: Host Employer** | 5 types | Host Employer T&Cs + Direct Debit, Rate Quote (Full Disclosure), Safety Assessment, New T&C Draft |
| **B: Apprentice** | 6 types | Contract of Employment + Rate Schedule, Interview/Registration, Probation Letter, Warning Letters, Payroll Deduction Authority, Work Experience Consent |
| **C: Lifecycle** | 6 types | Completion/Suspension/Termination Notice, Change of Year Agreement, Change of Year Letter (to host), Cancellation Letter (trade-specific), Extension Letter, TAFE Call-Up Letter |
| **D: Compliance** | 2 types | Performance Appraisal, Placement Report |
| **E: Claims** | 1 type | Incentive Claims Planner (internal — maps to existing `claims/calendar.tsx`) |

### Domain Corrections

- **Training contracts are created by AASS/AASN, not the GTO.** CRM7 tracks them, does not generate them.
- **GTOs generate employment contracts** (GTO is the employer of the apprentice).
- **BOOT applies to custom rates only** — EAs have FWC ascension, already cleared BOOT.
- **Wage compliance analysis** (wages paid vs all entitlements owed) is a union dispute tool — separate from BOOT export.

---

## 2. Architecture

```
TEMPLATE AUTHORING                    IN-APP EDITING
Google Docs (familiar,                Plate.js (block editor,
collaborative, free, versioned)       AI copilot, shadcn/ui, MIT)
    |                                     |
    v                                     v
[Document Template Registry — Supabase: document_templates]
    |
    v
[Merge Engine — Google Docs API batchUpdate() + replaceAllText()]
    |  1. Drive.files.copy(templateDocId) → new draft doc
    |  2. Docs.batchUpdate([replaceAllText({ {{VAR}} → value })])
    |  3. Drive.files.export(docId, 'application/pdf') → Buffer
    v
[Adobe Acrobat Sign REST v6]
    |  POST /agreements — upload PDF, define signers, signing order
    |  GET  /agreements/{id}/signingUrls — embedded widget
    |  Webhook → AGREEMENT_ACTION_COMPLETED
    v
[Supabase Storage — document_records table + signed PDF]
```

---

## 3. Database Schema

### 3.1 `document_templates`

```sql
CREATE TABLE document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'host_employer', 'apprentice', 'lifecycle', 'compliance', 'internal'
  )),
  subcategory text, -- 'contract' | 'letter' | 'form' | 'assessment' | 'notice'
  google_doc_id text, -- Google Docs template file ID (Drive)
  merge_variables jsonb NOT NULL DEFAULT '[]',
  -- [{key: "APPRENTICE_NAME", source: "people", field: "first_name || ' ' || last_name", required: true, description: "Full legal name"}]
  signing_config jsonb DEFAULT '[]',
  -- [{role: "apprentice", order: 1, email_source: "people.email"},
  --  {role: "host_employer_contact", order: 2, email_source: "clients.contact_email"},
  --  {role: "gto_officer", order: 3, email_source: "staff.email"}]
  requires_guardian_if_minor boolean NOT NULL DEFAULT false,
  branding_level text NOT NULL DEFAULT 'full' CHECK (branding_level IN ('full', 'header_only', 'minimal', 'none')),
  is_system_default boolean NOT NULL DEFAULT false, -- Ships with BSuite, tenant can override
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_templates_tenant ON document_templates(tenant_id, category, is_active);
```

### 3.2 `document_records`

```sql
CREATE TABLE document_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES document_templates(id),
  -- Entity context (what this document is about)
  entity_type text NOT NULL, -- 'person' | 'host_employer' | 'training_contract' | 'placement'
  entity_id uuid NOT NULL,
  -- File storage
  storage_bucket text NOT NULL,
  storage_path text NOT NULL, -- {tenant_id}/{category}/{entity_id}/{doc_id}/v{n}_draft.pdf
  signed_storage_path text,   -- Set after Adobe Sign completion
  file_size_bytes integer,
  -- Google Docs (draft)
  google_doc_id text,         -- The merged draft doc in Drive (can be edited before signing)
  -- Adobe Sign
  adobe_agreement_id text,
  adobe_agreement_status text, -- 'OUT_FOR_SIGNATURE' | 'SIGNED' | 'CANCELLED' | 'EXPIRED'
  -- Status
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'sent_for_signature', 'partially_signed',
    'signed', 'cancelled', 'archived'
  )),
  merge_data jsonb NOT NULL DEFAULT '{}', -- Snapshot of data used for merge (audit trail)
  version integer NOT NULL DEFAULT 1,
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_records_entity ON document_records(tenant_id, entity_type, entity_id);
CREATE INDEX idx_document_records_status ON document_records(tenant_id, status);
CREATE INDEX idx_document_records_adobe ON document_records(adobe_agreement_id) WHERE adobe_agreement_id IS NOT NULL;
```

### 3.3 `document_signatories`

```sql
CREATE TABLE document_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_record_id uuid NOT NULL REFERENCES document_records(id) ON DELETE CASCADE,
  role text NOT NULL, -- 'apprentice' | 'host_employer_contact' | 'gto_officer' | 'guardian'
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signing_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'viewed', 'signed', 'declined'
  )),
  adobe_participant_id text,
  signed_at timestamptz,
  ip_address text, -- From Adobe Sign audit trail
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 3.4 RLS Policies

```sql
-- All document tables: tenant-scoped
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_templates" ON document_templates
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "tenant_isolation_records" ON document_records
  USING (tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "tenant_isolation_signatories" ON document_signatories
  USING (document_record_id IN (
    SELECT id FROM document_records
    WHERE tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid())
  ));
```

---

## 4. Merge Variable Master Table

All 30+ variables from the 20 real GTO documents, mapped to CRM7 entities:

| Template Variable | CRM7 Source Query | Required | Used In |
|---|---|---|---|
| `{{GTO_NAME}}` | `tenants.name` | ✓ | All |
| `{{GTO_ABN}}` | `tenants.abn` | ✓ | A1, A4, B1 |
| `{{GTO_ADDRESS}}` | `tenants.address` | ✓ | A1, A4 |
| `{{APPRENTICE_NAME}}` | `people.first_name \|\| ' ' \|\| people.last_name` | ✓ | B1–B6, C1–C6, D1 |
| `{{APPRENTICE_FIRST_NAME}}` | `people.first_name` | ✓ | B3, B4 (salutations) |
| `{{APPRENTICE_ADDRESS}}` | `people.address` | | B1, B3, C1 |
| `{{APPRENTICE_DOB}}` | `people.date_of_birth` | | B2 |
| `{{APPRENTICE_EMAIL}}` | `people.email` | ✓ | Adobe Sign |
| `{{APPRENTICE_IS_MINOR}}` | `people.date_of_birth < now() - interval '18 years'` | ✓ | B1, B5, B6, C1 |
| `{{HOST_EMPLOYER_NAME}}` | `clients.name WHERE type='host_employer'` | ✓ | A1–A5, C3, C6, D1 |
| `{{HOST_EMPLOYER_ABN}}` | `clients.abn` | | A1, A4 |
| `{{HOST_CONTACT_NAME}}` | `clients.primary_contact_name` | ✓ | C3, C6, D1 |
| `{{HOST_CONTACT_EMAIL}}` | `clients.primary_contact_email` | ✓ | Adobe Sign |
| `{{QUALIFICATION_NAME}}` | `people.qualification_title` | ✓ | B1, D1 |
| `{{QUALIFICATION_CODE}}` | `people.qualification_code` | | A3 |
| `{{MODERN_AWARD_NAME}}` | Rate schedule context | ✓ | A1, A3, B1 |
| `{{COMMENCEMENT_DATE}}` | `training_contracts.start_date` | | B1 |
| `{{NOMINAL_TERM}}` | `training_contracts.nominal_term_months` | | B1 |
| `{{YEAR_LEVEL}}` | `training_contracts.current_year_level` | ✓ | C1, C2, C3, D1 |
| `{{PAY_RATE}}` | `@bsuite/charge-calc` output, `pay_rate_per_hour` | ✓ | A1, A3, B1, C3 |
| `{{CHARGE_RATE}}` | `@bsuite/charge-calc` output, `charge_rate_per_hour` | ✓ | A1, A3 |
| `{{FIELD_OFFICER_NAME}}` | `staff.first_name \|\| ' ' \|\| staff.last_name` | | A5, B3, D1 |
| `{{FIELD_OFFICER_EMAIL}}` | `staff.email` | ✓ | Adobe Sign |
| `{{RTO_NAME}}` | `training_providers.name` | | A2, B1, C6 |
| `{{RTO_CAMPUS}}` | `training_providers.campus` | | C6 |
| `{{PROBATION_END_DATE}}` | `training_contracts.probation_end_date` | | B3 |
| `{{LETTER_DATE}}` | `now()::date` formatted as "4 March 2026" | ✓ | All letters |
| `{{TRS_NUMBER}}` | `training_contracts.trs_number` | | C4, C5 |
| `{{EW_NUMBER}}` | `training_contracts.trade_licence_number` | | C4, C5 (electrical) |
| `{{CHANGE_OF_YEAR_DATE}}` | `training_contracts.next_coy_date` | | C2, C3 |
| `{{EXTENSION_MONTHS}}` | Provided at generation time | | C5 |
| `{{DEDUCTION_AMOUNT}}` | Provided at generation time | | B5 |

### Rate Schedule (Repeating Rows)

For documents A1 and A3 (Host Employer Contract + Rate Quote), the rate schedule is a table with repeating rows. Google Docs API handles this via `insertTableRow` + `insertText` requests for each classification/year level:

| Row Variable | Source |
|---|---|
| `{{JOB}}` | Classification code (e.g., `1ST_AP_ELEC`) |
| `{{JOB_NAME}}` | `"1st Yr Apprentice Electrician — Year 1 — UEE30820"` |
| `{{JOB_PAY_RATE}}` | `@bsuite/charge-calc` pay rate per hour |
| `{{JOB_CHARGE_BEFORE}}` | Charge rate before incentives |
| `{{JOB_CHARGE_AFTER}}` | Estimated charge after incentives |
| `{{ALLOWANCE_ITEM}}` | Allowance name (e.g., Tool Allowance) |
| `{{ALLOWANCE_PAY_RATE}}` | Allowance pay rate |
| `{{ALLOWANCE_CHARGE_RATE}}` | Allowance charge rate |

---

## 5. Signing Workflows

Five distinct patterns from the 20 documents:

| Pattern | Documents | Adobe Sign Config |
|---|---|---|
| **Sequential 3-party** | Employment contract, Host T&Cs | `signingOrder: [apprentice(1), host(2), gto_officer(3)]` |
| **Sequential + Guardian** | Any of above with minor | `signingOrder: [apprentice(1), guardian(2), host(3), gto_officer(4)]` |
| **Parallel** | Rate Quote, Host T&Cs standalone | `signerType: 'PARALLEL'` — both sign independently |
| **Single GTO** | All letters (probation, warnings, call-up, change-of-year, cancellation, extension) | `signerType: 'ESIGN'`, GTO only — no external signers |
| **Acknowledgement** | Warning letters | GTO signs first, apprentice signs acknowledgement block at bottom |

The `requires_guardian_if_minor` flag on `document_templates` triggers an additional signatory when `APPRENTICE_IS_MINOR = true`.

---

## 6. Google Docs Integration

### Auth

**Workload Identity Federation (WIF)** — no static service account keys.

The Edge Function exchanges the caller's Supabase JWT for a short-lived Google access token via:

1. Google Security Token Service (STS) — exchanges Supabase JWT for a federated token
2. Service account impersonation — exchanges federated token for a scoped access token

Supabase secrets (all non-sensitive metadata):

- `GCP_PROJECT_NUMBER` — GCP project number (`111744121676`)
- `GCP_WIF_POOL_ID` — `supabase-edge-functions`
- `GCP_WIF_PROVIDER_ID` — `supabase-auth`
- `GCP_SA_EMAIL` — `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com`

Scopes granted via SA impersonation:

- `https://www.googleapis.com/auth/drive` (copy, export)
- `https://www.googleapis.com/auth/documents` (batchUpdate)

The service account must be granted Viewer access to the template folder in Google Drive.

### Merge Flow (Edge Function)

```typescript
// Supabase Edge Function: generate-document
async function mergeDocument(templateId: string, entityData: MergeData): Promise<string> {
  // 1. Copy template
  const copyRes = await drive.files.copy({ fileId: template.google_doc_id });
  const draftDocId = copyRes.data.id;

  // 2. Build replaceAllText requests
  const requests = Object.entries(entityData).map(([key, value]) => ({
    replaceAllText: {
      containsText: { text: `{{${key}}}`, matchCase: true },
      replaceText: String(value ?? ''),
    },
  }));

  // 3. Batch update (single API call)
  await docs.documents.batchUpdate({
    documentId: draftDocId,
    requestBody: { requests },
  });

  // 4. Export as PDF
  const pdfBuffer = await drive.files.export({
    fileId: draftDocId,
    mimeType: 'application/pdf',
  }, { responseType: 'arraybuffer' });

  // 5. Upload to Supabase Storage
  const path = `${tenantId}/${category}/${entityId}/${recordId}/v1_draft.pdf`;
  await supabase.storage.from('documents').upload(path, pdfBuffer);

  return path;
}
```

### Template Authoring UX

Admin workflow:

1. Open Google Drive folder (shared link in CRM7 Template Registry page)
2. Duplicate an existing template in Drive
3. Edit in Google Docs — add/remove clauses, customize language
4. Use `{{VARIABLE_NAME}}` syntax for merge fields
5. Copy the Google Doc ID from the URL
6. Register the Doc ID in CRM7 Template Registry with merge variable mapping

The Template Registry page shows which variables a template uses and validates that CRM7 can resolve them.

---

## 7. Adobe Acrobat Sign Integration

### Service Module

```typescript
// crm7/src/services/adobeSignService.ts
const ADOBE_SIGN_BASE = 'https://api.na4.adobesign.com/api/rest/v6';

interface AdobeSignAgreement {
  name: string;
  fileInfos: [{ transientDocumentId: string }];
  participantSetsInfo: SignerSet[];
  signatureType: 'ESIGN' | 'WRITTEN';
  state: 'IN_PROCESS';
}

export const adobeSignService = {
  // Upload PDF → get transient document ID
  async uploadTransient(pdfBuffer: Buffer, fileName: string): Promise<string>,
  // Create agreement (defines signers, order, expiry)
  async createAgreement(params: CreateAgreementParams): Promise<string>, // returns agreementId
  // Get signing URL for embedding in CRM7
  async getSigningUrl(agreementId: string, signerEmail: string): Promise<string>,
  // Poll or webhook: get current status
  async getAgreementStatus(agreementId: string): Promise<AgreementStatus>,
  // Download signed PDF after completion
  async downloadSignedPdf(agreementId: string): Promise<Buffer>,
};
```

### Webhook Handler

Edge Function `adobe-sign-webhook` receives `AGREEMENT_ACTION_COMPLETED`:

1. Verify webhook HMAC signature (Adobe Sign sends `x-adobesign-clientid` header)
2. Look up `document_records` by `adobe_agreement_id`
3. Download signed PDF via `adobeSignService.downloadSignedPdf()`
4. Upload to `{path}/v1_signed.pdf` in Supabase Storage
5. Update `document_records.status = 'signed'`, `signed_at = now()`, `signed_storage_path`
6. Update each `document_signatories` record status
7. Create CRM7 notification for the generating user

---

## 8. Plate.js In-App Editor

For content that never leaves CRM7:

- **Case notes** on person records (`people/[id].tsx` — Notes tab)
- **Field officer site visit reports** (`field-officers/site-visits/`)
- **Performance review narratives** (`progress-reviews/reviews/`)
- **Internal memos** (`activities/`)

**Plate.js** (MIT, [platejs.org](https://platejs.org/)) chosen over alternatives:

- Built on Slate.js + React + **shadcn/ui** (matches existing component library exactly)
- AI Copilot plugin → routes through existing Vercel AI Gateway (Grok + Claude)
- Mention plugin → `@person`, `@employer` reference linking
- DOCX export for sharing outside CRM7
- MCP-compatible (future AI agent document manipulation)
- No vendor lock-in, no per-document fees (Tiptap Cloud excluded for this reason)

Storage: JSON content in `jsonb` columns on relevant entity tables (e.g., `people.case_notes jsonb`).

---

## 9. CRM7 UI — Documents Hub

### New Route: `/documents/hub`

```
/documents/hub
  ├── Tab: All Documents   — unified list, filter by type/entity/status/date
  ├── Tab: Templates       — document template registry (link to Google Docs)
  ├── Tab: Pending         — sent for signature, Adobe Sign status polling
  └── Tab: Signed          — completed documents, download signed PDFs
```

### "Generate Document" Modal

Triggered from any entity page (person detail, host detail, contract detail):

```
1. Select template     [dropdown — filtered to entity type, e.g., "host_employer" templates for /hosts/:id]
2. Preview merge data  [auto-populated from CRM7, editable before generation]
3. Review signers      [list of who will receive signing requests]
4. [ Edit in Google Docs first ] [optional — opens draft doc in new tab]
5. [ Generate & Send for Signature ]
```

After generation:

- Shows document status card inline
- "View in Adobe Sign" button
- Real-time status updates via Supabase Realtime subscription on `document_records`

### Entity Page Integration

"Generate Document" button added to:

| Page | Applicable Templates |
|------|---------------------|
| `people/[id].tsx` | Apprentice Employment Contract, Probation Letter, Warning Letters, Payroll Deduction, Work Experience Consent, Performance Appraisal, Change of Year Letter |
| `hosts/[id].tsx` | Host Employer T&Cs, Rate Quote, Safety Assessment |
| `contracts/training/[id].tsx` | Completion/Termination Notice, Cancellation Letter, Extension Letter, TAFE Call-Up Letter, Change of Year Agreement |
| `placements/[id].tsx` | Placement confirmation letter |

---

## 10. What This Replaces

| Current (Broken) State | After This Implementation |
|---|---|
| PDF Export buttons → `() => {}` stubs | Real PDF via Google Drive API export |
| Document upload → URL-paste only | Supabase Storage upload via `documentService.ts` |
| `signatureRequestStore` → DocuSign typed, zero integration | Adobe Sign REST v6 fully wired |
| No template editor | Google Docs (zero new UI, users already know it) |
| `TripleSignOff` → local state only | Adobe Sign for legal signatures; TripleSignOff for internal approvals (unchanged) |
| No branding/letterhead | Baked into Google Docs templates (tenant controls their own templates) |
| No document versioning | Google Docs revision history + `document_versions` table |
| All `mail-merge` Edge Function → saves batch record, generates nothing | Full merge pipeline: template → data → PDF → sign → store |

---

## 11. Out of Scope (This Phase)

- **AASS/ADMS form pre-fill** — government PDF forms require `pdf-lib` to fill AcroForm fields. Separate phase.
- **Wage compliance analysis report** (wages paid vs entitlements owed for union disputes) — requires payroll data module. Separate phase.
- **BOOT analysis PDF export** — relevant only for custom rates, requires BOOT engine (Phase 2 of R80-CRM7 roadmap).
- **Org branding config UI** — tenant logo/colors in DB, applied to template instructions. Low priority; admins set it in Google Docs templates themselves.
- **Real-time collaborative editing** in Plate.js — can be added via Liveblocks/Yjs, not required for launch.

---

## 12. Security Considerations

- Google API access via Workload Identity Federation (no static service account keys)
- Adobe Sign API key in Supabase secrets
- All generated PDFs in private Supabase Storage buckets with RLS
- Generated draft Google Docs: auto-delete after 30 days (Drive API scheduled cleanup)
- Signed PDFs: retained indefinitely (compliance requirement)
- Webhook HMAC verification before processing any Adobe Sign event
- Merge data snapshot stored in `document_records.merge_data` for audit (immutable after generation)

---

## 13. Dependencies

No new paid services. New npm packages required:

```json
{
  "dependencies": {
    "googleapis": "^144.0.0",          // Google Docs + Drive API client
    "@platejs/core": "^48.0.0",        // Plate.js block editor
    "@platejs/ai": "^48.0.0",          // Plate AI Copilot plugin
    "@platejs/mention": "^48.0.0",     // @person, @employer mentions
    "@platejs/basic-nodes": "^48.0.0", // Paragraphs, headings, lists
    "@platejs/table": "^48.0.0",       // Table blocks
    "pdf-lib": "^1.17.1"               // Government form filling (Phase 2)
  }
}
```

`googleapis` runs server-side only (Edge Function / Vercel API route). Plate.js is client-side only.

---

## References

- [Google Docs API — replaceAllText](https://developers.google.com/workspace/docs/api/how-tos/merge)
- [Google Docs API — batchUpdate requests](https://developers.google.com/workspace/docs/api/reference/rest/v1/documents/request)
- [Adobe Acrobat Sign REST v6](https://opensource.adobe.com/acrobat-sign/developer_guide/index.html)
- [Adobe Sign — Create Embedded Experiences](https://experienceleague.adobe.com/en/docs/document-cloud-learn/sign-learning-hub/develop/custom/embeddedesignature)
- [Plate.js Documentation](https://platejs.org/docs)
- [Plate.js AI Copilot Plugin](https://platejs.org/docs/copilot)
- [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control)
- [National Standards for GTOs 2017](https://content.apprenticeships.gov.au/sites/default/files/2023-11/National%20Standards%20for%20GTOs.pdf)
- [Electronic Transactions Act 1999 — AG Department](https://www.ag.gov.au/legal-system/electronic-signatures-documents-and-transactions/electronic-signatures)
