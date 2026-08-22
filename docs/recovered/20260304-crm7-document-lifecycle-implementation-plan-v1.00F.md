---
kind: record
authority: none
owner: bsuite-lane
verdict: dead
---

> # ⛔ VERDICT: DEAD — DO NOT BUILD FROM THIS DOCUMENT
>
> **Verdicted 2026-08-17 against live code and the live production database.**
> **This is the live trap named in `docs/recovered/00-READ-THIS-FIRST-corpus-health.md` §1.**
>
> Everything below is 2,342 lines of task-by-task instructions for building on
> **Adobe Acrobat Sign**. Adobe Sign was **rejected on 2026-03-04 — the same day this plan
> was written** — in `20260304-document-esign-best-practice-research-v1.00W.md` §9, and the
> replacement shipped on 2026-03-17. This plan was never revised.
>
> It is the **longest and most detailed document in this directory**, so it is the one an
> agent reads first and trusts most. That is the whole danger: the detail was written
> *before* the reversal made it worthless, and the plan is *older*, so it sorts first.
>
> **The successor, and the only current truth:**
> [`20260317-document-esigning-architecture-v1.00A.md`](./20260317-document-esigning-architecture-v1.00A.md)
> — *"Replaces: Adobe Sign, DocuSeal, Adobe PDF Services (all removed — zero vendor dependency)."*
>
> **Measured, 2026-08-17, not inferred:**
>
> | claim | measurement |
> |---|---|
> | Adobe Sign is not built | `adobeSignService`/`adobe-sign` appear in **0** application files across all six submodules and `supabase/` (one unrelated test-name match aside). Positive control: the same grep for `document_records` returns 3 crm7 files. |
> | `document_records` is the live shape | present in production, **1 row** |
> | `signature_requests` is the live signing surface | present in production, **5 rows** |
> | `document_signatories` — **the corpus-health note is now stale on this one point** | it says the shipped shape has **no** `document_signatories`. It **exists in production**, recreated by `crm7/supabase/migrations/20260730231100_recreate_document_signing.sql` for a `SignDocumentFlow.tsx` that **no longer exists in `crm7/src`**. **0 rows**, referenced only by generated types. See the deliverable's G5 section — this is an open question, not a licence to build the Adobe shape. |
>
> **The rule this document exists to teach:** before treating anything in `recovered/` as a
> spec, find its successor. Trust the document that claims SHIPPED over the one that claims
> WORKING, *regardless of length or detail*.
>
<!-- G5-VERDICT-BANNER -->
> **VERDICT (NEVER-BUILT-AND-SHOULD-NOT-BE) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⛔ STOP — DO NOT BUILD FROM THIS DOCUMENT
>
> **Verdict: NEVER-BUILT-AND-SHOULD-NOT-BE.** This is a 2,342-line, task-by-task build plan
> for **Adobe Acrobat Sign — a vendor that was rejected on 2026-03-04, the same day this plan
> was written.** The plan was never revised. It is the longest and most actionable document in
> `docs/recovered/`, so it is the one an agent reads first and trusts most. That is what makes
> it a trap rather than merely stale.
>
> **The rejection, same day:** `20260304-document-esign-best-practice-research-v1.00W.md` §9 —
> *"~~Stay with Adobe Acrobat Sign~~ → SUPERSEDED … the self-hosted approach was selected."*
> **The replacement, shipped 2026-03-17:** `20260317-document-esigning-architecture-v1.00A.md`
> — self-hosted signing, *"zero vendor dependency"*.
>
> ## This trap has already fired once — it is not hypothetical
>
> | When | What happened |
> |---|---|
> | 2026-03-04 | This plan written. Adobe rejected the same day. Plan never revised. |
> | 2026-05-15 | `crm7#687` deletes `adobe-sign-webhook` **source** — *"Adobe Sign vendor was removed"*. Issue **CLOSED** (crm7 `482214dc`). |
> | — | **The deployed function was never undeployed.** Deleting source does not remove a live edge function; it only makes it sourceless. |
> | 2026-08-16 | `bsuite#1955` finds it ACTIVE in production **with no source**, and **rehomes it verbatim** (crm7 `d68f6fe3`), then hardens it with careful CORS, rate-limiter and JWT work (`16cfec84`, `69a1517c`, `02ae4657`). |
>
> **Net effect: the rejected vendor's public webhook is back in the repo, hardened, deployed,
> and now reads as legitimate infrastructure.** The 2026-05-15 source deletion *caused* the
> 2026-08-16 resurrection, because a sourceless live function is exactly what that audit hunted.
>
> ## Measured against the live database (project `tuybltdrdefjblnplpqo`, 2026-08-17)
>
> - `adobe-sign-webhook` — **ACTIVE**, v42, redeployed 2026-08-16. Source:
>   `crm7/supabase/functions/adobe-sign-webhook/index.ts` (320 lines).
> - `public.document_signatories` — **exists**, 12 columns, including **`adobe_participant_id`**.
> - **`document_signatories` = 0 rows; `adobe_participant_id` non-null = 0 rows.** Nothing has
>   ever flowed through the Adobe path. It is pure dead surface.
>
> **Correction to two other live documents, recorded here rather than silently fixed:**
> `00-READ-THIS-FIRST-corpus-health.md` and `crm7#1476` both state the live shape has
> **no** `document_signatories`. **It does.** That table is live today with an Adobe column.
>
> ## If you are here to work on document signing
>
> Build on the **2026-03-17** shape, and read `crm7#1476` (open) first. Removal of the live
> Adobe residue is tracked at **`crm7#1779`** (open). Note that `crm7#687`, the issue that
> claims this was already retired, is **CLOSED and wrong**.
>
> *Nothing below this line has been edited. The rejected plan is left legible on purpose —
> this estate marks corrections, it does not quietly rewrite them.*

---

# CRM7 Document Lifecycle System — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use executing-plans to implement this plan task-by-task.

**Goal:** Build a full document lifecycle system for CRM7 — Google Docs template authoring → merge-to-PDF → Adobe Acrobat Sign → Supabase Storage — covering all 20 real GTO document types.

**Architecture:** Google Docs API for template authoring + merge (replaceAllText), Adobe Sign REST v6 for e-signatures, Plate.js for in-app case notes/field reports, Supabase Storage for signed PDF archival. Zero new SaaS subscriptions — all tools already licensed or MIT.

**Design Spec:** `docs/plans/20260304-crm7-document-lifecycle-design-v1.00F.md`

**Tech Stack:** React + Vite + wouter (CRM7), Supabase Edge Functions (Deno), Google APIs client (googleapis), Adobe Sign REST v6, Plate.js v48+, pdf-lib, shadcn/ui, Zod, TypeScript strict

---

## Phase 0 — Prerequisites

### Task 0.1: Install dependencies

**Files:**

- Modify: `crm7/package.json`
- Modify: `crm7/pnpm-lock.yaml`

**Step 1: Install client-side packages**

```bash
cd crm7
pnpm add @platejs/core @platejs/ai @platejs/mention @platejs/basic-nodes @platejs/table @platejs/basic-marks pdf-lib
```

**Step 2: Install server-side packages (for Vercel API route / Edge Function)**

```bash
pnpm add googleapis
pnpm add -D @types/node
```

**Step 3: Verify installs**

```bash
pnpm tsc --noEmit
```

Expected: 0 errors (new packages are typed)

**Step 4: Commit**

```bash
git add crm7/package.json crm7/pnpm-lock.yaml
git commit -m "chore(crm7): install document lifecycle dependencies (platejs, googleapis, pdf-lib)"
```

---

## Phase 1 — Database Schema

### Task 1.1: Create migration for document tables

**Files:**

- Create: `crm7/supabase/migrations/20260304000001_document_lifecycle.sql`

**Step 1: Write the migration**

```sql
-- Migration: document lifecycle tables
-- Run: supabase db push (or supabase migration up)

-- ─────────────────────────────────────────────────
-- document_templates: registry of Google Docs templates
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN (
    'host_employer', 'apprentice', 'lifecycle', 'compliance', 'internal'
  )),
  subcategory text,
  google_doc_id text,
  merge_variables jsonb NOT NULL DEFAULT '[]',
  signing_config jsonb NOT NULL DEFAULT '[]',
  requires_guardian_if_minor boolean NOT NULL DEFAULT false,
  branding_level text NOT NULL DEFAULT 'full' CHECK (branding_level IN (
    'full', 'header_only', 'minimal', 'none'
  )),
  is_system_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_templates_tenant
  ON document_templates(tenant_id, category, is_active);

-- ─────────────────────────────────────────────────
-- document_records: generated document instances
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id uuid REFERENCES document_templates(id),
  entity_type text NOT NULL CHECK (entity_type IN (
    'person', 'host_employer', 'training_contract', 'placement', 'other'
  )),
  entity_id uuid NOT NULL,
  storage_bucket text NOT NULL DEFAULT 'documents',
  storage_path text NOT NULL,
  signed_storage_path text,
  file_size_bytes integer,
  google_doc_id text,
  adobe_agreement_id text,
  adobe_agreement_status text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending_review', 'sent_for_signature', 'partially_signed',
    'signed', 'cancelled', 'archived'
  )),
  merge_data jsonb NOT NULL DEFAULT '{}',
  version integer NOT NULL DEFAULT 1,
  generated_by uuid NOT NULL REFERENCES auth.users(id),
  generated_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_records_entity
  ON document_records(tenant_id, entity_type, entity_id);
CREATE INDEX idx_document_records_status
  ON document_records(tenant_id, status);
CREATE UNIQUE INDEX idx_document_records_adobe
  ON document_records(adobe_agreement_id)
  WHERE adobe_agreement_id IS NOT NULL;

-- ─────────────────────────────────────────────────
-- document_signatories: who must sign each document
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS document_signatories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_record_id uuid NOT NULL REFERENCES document_records(id) ON DELETE CASCADE,
  role text NOT NULL,
  signer_name text NOT NULL,
  signer_email text NOT NULL,
  signing_order integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'viewed', 'signed', 'declined'
  )),
  adobe_participant_id text,
  signed_at timestamptz,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_signatories_record
  ON document_signatories(document_record_id);

-- ─────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_templates" ON document_templates
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_records" ON document_records
  FOR ALL USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "tenant_isolation_signatories" ON document_signatories
  FOR ALL USING (
    document_record_id IN (
      SELECT id FROM document_records
      WHERE tenant_id = (SELECT tenant_id FROM user_profiles WHERE user_id = auth.uid())
    )
  );

-- ─────────────────────────────────────────────────
-- updated_at trigger (reuse existing function if present)
-- ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER document_records_updated_at
  BEFORE UPDATE ON document_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Apply migration**

```bash
cd crm7
supabase db push
```

Expected: "Applying migration 20260304000001_document_lifecycle.sql... done"

**Step 3: Verify in Supabase Studio**

Open Supabase Studio → Table Editor → confirm `document_templates`, `document_records`, `document_signatories` tables exist with correct columns and RLS enabled.

**Step 4: Commit**

```bash
git add crm7/supabase/migrations/20260304000001_document_lifecycle.sql
git commit -m "feat(crm7): add document lifecycle DB schema — templates, records, signatories tables + RLS"
```

---

### Task 1.2: TypeScript types for document entities

**Files:**

- Create: `crm7/src/types/documents.ts`
- Modify: `crm7/src/types/index.ts` (barrel export)

**Step 1: Write types**

```typescript
// crm7/src/types/documents.ts

export type DocumentCategory =
  | 'host_employer'
  | 'apprentice'
  | 'lifecycle'
  | 'compliance'
  | 'internal';

export type DocumentStatus =
  | 'draft'
  | 'pending_review'
  | 'sent_for_signature'
  | 'partially_signed'
  | 'signed'
  | 'cancelled'
  | 'archived';

export type SignatoryStatus =
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'signed'
  | 'declined';

export type SignatoryRole =
  | 'apprentice'
  | 'host_employer_contact'
  | 'gto_officer'
  | 'guardian'
  | 'witness';

export interface MergeVariable {
  key: string;           // e.g. "APPRENTICE_NAME"
  source: string;        // e.g. "people"
  field: string;         // e.g. "first_name || ' ' || last_name"
  required: boolean;
  description: string;
}

export interface SigningConfigEntry {
  role: SignatoryRole;
  order: number;
  email_source: string;  // e.g. "people.email"
  name_source: string;   // e.g. "people.first_name || ' ' || people.last_name"
}

export interface DocumentTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: DocumentCategory;
  subcategory: string | null;
  google_doc_id: string | null;
  merge_variables: MergeVariable[];
  signing_config: SigningConfigEntry[];
  requires_guardian_if_minor: boolean;
  branding_level: 'full' | 'header_only' | 'minimal' | 'none';
  is_system_default: boolean;
  is_active: boolean;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  tenant_id: string;
  template_id: string | null;
  entity_type: 'person' | 'host_employer' | 'training_contract' | 'placement' | 'other';
  entity_id: string;
  storage_bucket: string;
  storage_path: string;
  signed_storage_path: string | null;
  file_size_bytes: number | null;
  google_doc_id: string | null;
  adobe_agreement_id: string | null;
  adobe_agreement_status: string | null;
  status: DocumentStatus;
  merge_data: Record<string, unknown>;
  version: number;
  generated_by: string;
  generated_at: string;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  template?: DocumentTemplate;
  signatories?: DocumentSignatory[];
}

export interface DocumentSignatory {
  id: string;
  document_record_id: string;
  role: SignatoryRole;
  signer_name: string;
  signer_email: string;
  signing_order: number;
  status: SignatoryStatus;
  adobe_participant_id: string | null;
  signed_at: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface GenerateDocumentParams {
  templateId: string;
  entityType: DocumentRecord['entity_type'];
  entityId: string;
  overrides?: Record<string, string>; // Manual overrides for merge vars
  sendForSignature?: boolean;
}

export interface GenerateDocumentResult {
  documentRecord: DocumentRecord;
  pdfUrl: string;
  googleDocUrl?: string;
  signingUrl?: string; // Adobe Sign embedded URL (if sendForSignature=true)
}
```

**Step 2: Add barrel export**

```typescript
// In crm7/src/types/index.ts — add:
export * from './documents';
```

**Step 3: Verify types compile**

```bash
cd crm7 && pnpm tsc --noEmit
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add crm7/src/types/documents.ts crm7/src/types/index.ts
git commit -m "feat(crm7): add document lifecycle TypeScript types"
```

---

### Task 1.3: Supabase Storage bucket setup

**Files:**

- Create: `crm7/supabase/migrations/20260304000002_document_storage.sql`

**Step 1: Write the bucket migration**

Check `crm7/src/services/documentService.ts` first — 14 buckets are already defined. Verify `documents` bucket exists. If not, create it.

```sql
-- 20260304000002_document_storage.sql
-- Ensure documents bucket exists and is private
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- PRIVATE: never public
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = 52428800;

-- RLS: tenant-scoped read/write
CREATE POLICY "tenant_document_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM user_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "tenant_document_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (
      SELECT tenant_id::text FROM user_profiles WHERE user_id = auth.uid()
    )
  );
```

**Step 2: Apply**

```bash
supabase db push
```

**Step 3: Commit**

```bash
git add crm7/supabase/migrations/20260304000002_document_storage.sql
git commit -m "feat(crm7): configure documents storage bucket with RLS"
```

---

## Phase 2 — Google Workspace Integration

### Task 2.1: Google Cloud Workload Identity Federation setup

**Files:**

- No code files — GCP + Supabase configuration only

**Step 1: Configure WIF in Google Cloud** (already done — 2026-03-05)

1. GCP project: `claritycrm-hpofn` (project number `111744121676`)
2. APIs enabled: Google Docs API, Google Drive API, IAM Credentials API
3. Service account: `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
4. WIF pool: `supabase-edge-functions` (global)
5. WIF OIDC provider: `supabase-auth` (trusts Supabase OIDC issuer `https://tuybltdrdefjblnplpqo.supabase.co/auth/v1`)
6. IAM binding: `roles/iam.workloadIdentityUser` granted to the WIF pool for the service account
7. Add the service account email to your Google Drive template folder with **Viewer** access

**Step 2: Store WIF config in Supabase secrets** (already done — 2026-03-05)

```bash
supabase secrets set \
  GCP_PROJECT_NUMBER='111744121676' \
  GCP_WIF_POOL_ID='supabase-edge-functions' \
  GCP_WIF_PROVIDER_ID='supabase-auth' \
  GCP_SA_EMAIL='firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com'
```

**Step 3: `.env.example` updated** (already done — 2026-03-05)

```bash
# Google Cloud — Workload Identity Federation (Edge Functions only)
# These are non-sensitive metadata — set via: supabase secrets set KEY='value'
# GCP_PROJECT_NUMBER=111744121676
# GCP_WIF_POOL_ID=supabase-edge-functions
# GCP_WIF_PROVIDER_ID=supabase-auth
# GCP_SA_EMAIL=firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com
```

**Step 4: Commit .env.example**

```bash
git add crm7/.env.example
git commit -m "chore(crm7): document lifecycle env vars in .env.example"
```

---

### Task 2.2: Google Docs service

**Files:**

- Create: `crm7/src/services/googleDocsService.ts`
- Create: `crm7/src/services/__tests__/googleDocsService.test.ts`

**Step 1: Write the failing test**

```typescript
// crm7/src/services/__tests__/googleDocsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildReplaceRequests } from '../googleDocsService';

describe('buildReplaceRequests', () => {
  it('converts merge data to Google Docs replaceAllText requests', () => {
    const mergeData = {
      APPRENTICE_NAME: 'Jordan Smith',
      HOST_EMPLOYER_NAME: 'Acme Electrical Pty Ltd',
      LETTER_DATE: '4 March 2026',
    };

    const requests = buildReplaceRequests(mergeData);

    expect(requests).toHaveLength(3);
    expect(requests[0]).toEqual({
      replaceAllText: {
        containsText: { text: '{{APPRENTICE_NAME}}', matchCase: true },
        replaceText: 'Jordan Smith',
      },
    });
    expect(requests[2].replaceAllText.containsText.text).toBe('{{LETTER_DATE}}');
  });

  it('converts null/undefined values to empty string (never crashes merge)', () => {
    const requests = buildReplaceRequests({ MISSING_FIELD: null as unknown as string });
    expect(requests[0].replaceAllText.replaceText).toBe('');
  });

  it('formats date values as "4 March 2026" not ISO string', () => {
    const requests = buildReplaceRequests({ LETTER_DATE: new Date('2026-03-04') as unknown as string });
    expect(requests[0].replaceAllText.replaceText).toBe('4 March 2026');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd crm7 && pnpm vitest run src/services/__tests__/googleDocsService.test.ts
```

Expected: FAIL — "buildReplaceRequests is not defined"

**Step 3: Implement the service**

```typescript
// crm7/src/services/googleDocsService.ts
// Server-side only — runs in Supabase Edge Function or Vercel API route
// DO NOT import from client-side components

import type { docs_v1 } from 'googleapis';

export type MergeData = Record<string, string | number | Date | null | undefined>;

/**
 * Converts a flat merge data map to Google Docs API batchUpdate requests.
 * Template variables use {{VARIABLE_NAME}} syntax.
 */
export function buildReplaceRequests(
  mergeData: MergeData
): docs_v1.Schema$Request[] {
  return Object.entries(mergeData).map(([key, value]) => ({
    replaceAllText: {
      containsText: { text: `{{${key}}}`, matchCase: true },
      replaceText: formatMergeValue(value),
    },
  }));
}

function formatMergeValue(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return value.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  return String(value);
}

/**
 * Merges data into a Google Docs template.
 * Returns: { draftDocId, pdfBuffer }
 *
 * Requires GOOGLE_SERVICE_ACCOUNT_JSON environment variable.
 * Run only in server context (Edge Function / Vercel API route).
 */
export async function mergeGoogleDocTemplate(params: {
  templateDocId: string;
  mergeData: MergeData;
  driveParentFolderId?: string;
}): Promise<{ draftDocId: string; pdfBuffer: ArrayBuffer }> {
  const { google } = await import('googleapis');

  const credentials = JSON.parse(
    Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON') ?? process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ''
  );

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  });

  const drive = google.drive({ version: 'v3', auth });
  const docs = google.docs({ version: 'v1', auth });

  // 1. Copy template
  const copyRes = await drive.files.copy({
    fileId: params.templateDocId,
    requestBody: {
      name: `[DRAFT] ${Date.now()}`,
      parents: params.driveParentFolderId ? [params.driveParentFolderId] : undefined,
    },
  });
  const draftDocId = copyRes.data.id!;

  // 2. Merge all variables in a single batchUpdate
  const requests = buildReplaceRequests(params.mergeData);
  if (requests.length > 0) {
    await docs.documents.batchUpdate({
      documentId: draftDocId,
      requestBody: { requests },
    });
  }

  // 3. Export as PDF
  const exportRes = await drive.files.export(
    { fileId: draftDocId, mimeType: 'application/pdf' },
    { responseType: 'arraybuffer' }
  );

  return {
    draftDocId,
    pdfBuffer: exportRes.data as ArrayBuffer,
  };
}
```

**Step 4: Run tests**

```bash
cd crm7 && pnpm vitest run src/services/__tests__/googleDocsService.test.ts
```

Expected: 3 PASS

**Step 5: Commit**

```bash
git add crm7/src/services/googleDocsService.ts crm7/src/services/__tests__/googleDocsService.test.ts
git commit -m "feat(crm7): Google Docs merge service — buildReplaceRequests + mergeGoogleDocTemplate"
```

---

### Task 2.3: Merge variable resolver

**Files:**

- Create: `crm7/src/services/mergeVariableResolver.ts`
- Create: `crm7/src/services/__tests__/mergeVariableResolver.test.ts`

**Step 1: Write the failing test**

```typescript
// crm7/src/services/__tests__/mergeVariableResolver.test.ts
import { describe, it, expect, vi } from 'vitest';
import { resolveMergeVariables } from '../mergeVariableResolver';

describe('resolveMergeVariables', () => {
  it('resolves APPRENTICE_NAME from person entity', async () => {
    const mockPerson = { id: 'p1', first_name: 'Jordan', last_name: 'Smith', email: 'j@example.com' };

    const result = await resolveMergeVariables({
      templateMergeVariables: [
        { key: 'APPRENTICE_NAME', source: 'person', field: 'full_name', required: true, description: '' },
      ],
      entityType: 'person',
      entityId: 'p1',
      entityData: { person: mockPerson },
    });

    expect(result['APPRENTICE_NAME']).toBe('Jordan Smith');
  });

  it('resolves LETTER_DATE as formatted date', async () => {
    const result = await resolveMergeVariables({
      templateMergeVariables: [
        { key: 'LETTER_DATE', source: 'system', field: 'today', required: true, description: '' },
      ],
      entityType: 'person',
      entityId: 'p1',
      entityData: {},
    });

    expect(result['LETTER_DATE']).toMatch(/\d+ \w+ \d{4}/); // "4 March 2026"
  });

  it('returns empty string for optional missing fields (no throw)', async () => {
    const result = await resolveMergeVariables({
      templateMergeVariables: [
        { key: 'OPTIONAL_FIELD', source: 'person', field: 'middle_name', required: false, description: '' },
      ],
      entityType: 'person',
      entityId: 'p1',
      entityData: { person: { id: 'p1', first_name: 'Jordan' } },
    });

    expect(result['OPTIONAL_FIELD']).toBe('');
  });

  it('throws for required fields that cannot be resolved', async () => {
    await expect(resolveMergeVariables({
      templateMergeVariables: [
        { key: 'APPRENTICE_EMAIL', source: 'person', field: 'email', required: true, description: '' },
      ],
      entityType: 'person',
      entityId: 'p1',
      entityData: { person: { id: 'p1', first_name: 'Jordan' } }, // no email
    })).rejects.toThrow('Required merge variable APPRENTICE_EMAIL could not be resolved');
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm vitest run src/services/__tests__/mergeVariableResolver.test.ts
```

Expected: FAIL

**Step 3: Implement resolver**

```typescript
// crm7/src/services/mergeVariableResolver.ts
import type { MergeVariable, MergeData } from './googleDocsService';

interface ResolverContext {
  templateMergeVariables: MergeVariable[];
  entityType: string;
  entityId: string;
  entityData: Record<string, Record<string, unknown>>;
  overrides?: Record<string, string>;
}

/**
 * Resolves all merge variables for a template given entity data.
 * Throws if a required variable cannot be resolved.
 */
export async function resolveMergeVariables(ctx: ResolverContext): Promise<MergeData> {
  const result: MergeData = {};

  for (const variable of ctx.templateMergeVariables) {
    const override = ctx.overrides?.[variable.key];
    if (override !== undefined) {
      result[variable.key] = override;
      continue;
    }

    const value = resolveField(variable, ctx.entityData);

    if ((value === null || value === undefined || value === '') && variable.required) {
      throw new Error(`Required merge variable ${variable.key} could not be resolved`);
    }

    result[variable.key] = value ?? '';
  }

  return result;
}

function resolveField(
  variable: MergeVariable,
  entityData: Record<string, Record<string, unknown>>
): string | Date | null {
  // System variables
  if (variable.source === 'system') {
    if (variable.field === 'today') return new Date();
    return null;
  }

  const entity = entityData[variable.source];
  if (!entity) return null;

  // Composite field: "full_name" → first_name + ' ' + last_name
  if (variable.field === 'full_name') {
    const first = String(entity.first_name ?? '');
    const last = String(entity.last_name ?? '');
    return [first, last].filter(Boolean).join(' ') || null;
  }

  const value = entity[variable.field];
  if (value === null || value === undefined) return null;
  return String(value);
}
```

**Step 4: Run tests**

```bash
pnpm vitest run src/services/__tests__/mergeVariableResolver.test.ts
```

Expected: 4 PASS

**Step 5: Commit**

```bash
git add crm7/src/services/mergeVariableResolver.ts crm7/src/services/__tests__/mergeVariableResolver.test.ts
git commit -m "feat(crm7): merge variable resolver — entity-aware, required field validation"
```

---

### Task 2.4: Edge Function — generate-document

**Files:**

- Create: `crm7/supabase/functions/generate-document/index.ts`

**Step 1: Write the Edge Function**

```typescript
// crm7/supabase/functions/generate-document/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { mergeGoogleDocTemplate, buildReplaceRequests } from '../../src/services/googleDocsService.ts';
import { resolveMergeVariables } from '../../src/services/mergeVariableResolver.ts';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { templateId, entityType, entityId, overrides, sendForSignature } = await req.json();

  // 1. Fetch template
  const { data: template, error: templateError } = await supabase
    .from('document_templates')
    .select('*')
    .eq('id', templateId)
    .single();
  if (templateError || !template) {
    return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  // 2. Fetch entity data
  const entityData = await fetchEntityData(supabase, entityType, entityId);

  // 3. Resolve merge variables
  const mergeData = await resolveMergeVariables({
    templateMergeVariables: template.merge_variables,
    entityType,
    entityId,
    entityData,
    overrides,
  });

  // 4. Merge template + export PDF
  const { draftDocId, pdfBuffer } = await mergeGoogleDocTemplate({
    templateDocId: template.google_doc_id,
    mergeData,
  });

  // 5. Upload to Supabase Storage
  const recordId = crypto.randomUUID();
  const storagePath = `${template.tenant_id}/${template.category}/${entityId}/${recordId}/v1_draft.pdf`;

  await supabase.storage.from('documents').upload(storagePath, pdfBuffer, {
    contentType: 'application/pdf',
    upsert: false,
  });

  // 6. Create document_record
  const { data: record } = await supabase
    .from('document_records')
    .insert({
      id: recordId,
      tenant_id: template.tenant_id,
      template_id: templateId,
      entity_type: entityType,
      entity_id: entityId,
      storage_bucket: 'documents',
      storage_path: storagePath,
      google_doc_id: draftDocId,
      status: 'draft',
      merge_data: mergeData,
      generated_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  // 7. Optionally send for signature (Adobe Sign — Phase 3)
  // if (sendForSignature && template.signing_config.length > 0) { ... }

  return Response.json({
    documentRecord: record,
    pdfUrl: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/authenticated/${storagePath}`,
    googleDocUrl: `https://docs.google.com/document/d/${draftDocId}/edit`,
  });
});

async function fetchEntityData(
  supabase: ReturnType<typeof createClient>,
  entityType: string,
  entityId: string
): Promise<Record<string, Record<string, unknown>>> {
  const entityData: Record<string, Record<string, unknown>> = {};

  if (entityType === 'person') {
    const { data } = await supabase
      .from('people')
      .select('*, employer:clients!current_host_employer_id(*)')
      .eq('id', entityId)
      .single();
    if (data) {
      entityData.person = data;
      if (data.employer) entityData.host_employer = data.employer;
    }
  }

  if (entityType === 'host_employer') {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', entityId)
      .single();
    if (data) entityData.host_employer = data;
  }

  // Add tenant data (GTO Name, ABN, etc.)
  const { data: tenant } = await supabase.from('tenants').select('*').single();
  if (tenant) entityData.tenant = tenant;

  return entityData;
}
```

**Step 2: Deploy Edge Function**

```bash
supabase functions deploy generate-document --no-verify-jwt
```

Expected: "Function generate-document deployed successfully"

**Step 3: Smoke test via curl**

```bash
curl -X POST https://<project>.supabase.co/functions/v1/generate-document \
  -H "Authorization: Bearer <anon_key>" \
  -H "Content-Type: application/json" \
  -d '{"templateId": "<a-template-id>", "entityType": "person", "entityId": "<a-person-id>"}'
```

Expected: JSON with `documentRecord` and `pdfUrl`

**Step 4: Commit**

```bash
git add crm7/supabase/functions/generate-document/index.ts
git commit -m "feat(crm7): generate-document Edge Function — Google Docs merge → Supabase Storage"
```

---

## Phase 3 — Adobe Acrobat Sign Integration

### Task 3.1: Adobe Sign service

**Files:**

- Create: `crm7/src/services/adobeSignService.ts`
- Create: `crm7/src/services/__tests__/adobeSignService.test.ts`

**Step 1: Write the failing test**

```typescript
// crm7/src/services/__tests__/adobeSignService.test.ts
import { describe, it, expect } from 'vitest';
import { buildParticipantSets } from '../adobeSignService';
import type { SigningConfigEntry, DocumentSignatory } from '@/types/documents';

describe('buildParticipantSets', () => {
  it('builds sequential participant sets from signing config', () => {
    const config: SigningConfigEntry[] = [
      { role: 'apprentice', order: 1, email_source: 'people.email', name_source: 'people.full_name' },
      { role: 'gto_officer', order: 2, email_source: 'staff.email', name_source: 'staff.full_name' },
    ];
    const signatories: DocumentSignatory[] = [
      { id: 's1', document_record_id: 'd1', role: 'apprentice', signer_name: 'Jordan Smith', signer_email: 'j@example.com', signing_order: 1, status: 'pending', adobe_participant_id: null, signed_at: null, ip_address: null, created_at: '' },
      { id: 's2', document_record_id: 'd1', role: 'gto_officer', signer_name: 'Alex Manager', signer_email: 'a@gto.com', signing_order: 2, status: 'pending', adobe_participant_id: null, signed_at: null, ip_address: null, created_at: '' },
    ];

    const sets = buildParticipantSets(signatories);

    expect(sets).toHaveLength(2);
    expect(sets[0].order).toBe(1);
    expect(sets[0].memberInfos[0].email).toBe('j@example.com');
    expect(sets[1].order).toBe(2);
  });

  it('groups same-order signatories into one parallel set', () => {
    const signatories: DocumentSignatory[] = [
      { id: 's1', document_record_id: 'd1', role: 'apprentice', signer_name: 'A', signer_email: 'a@x.com', signing_order: 1, status: 'pending', adobe_participant_id: null, signed_at: null, ip_address: null, created_at: '' },
      { id: 's2', document_record_id: 'd1', role: 'host_employer_contact', signer_name: 'B', signer_email: 'b@x.com', signing_order: 1, status: 'pending', adobe_participant_id: null, signed_at: null, ip_address: null, created_at: '' },
    ];

    const sets = buildParticipantSets(signatories);

    expect(sets).toHaveLength(1); // same order → parallel set
    expect(sets[0].memberInfos).toHaveLength(2);
  });
});
```

**Step 2: Run to verify failure**

```bash
pnpm vitest run src/services/__tests__/adobeSignService.test.ts
```

**Step 3: Implement service**

```typescript
// crm7/src/services/adobeSignService.ts
import type { DocumentSignatory } from '@/types/documents';

const ADOBE_BASE_URL = 'https://api.na4.adobesign.com/api/rest/v6';

function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${import.meta.env.VITE_ADOBE_SIGN_ACCESS_TOKEN ?? process.env.ADOBE_SIGN_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };
}

/** Groups signatories by signing_order into Adobe participant sets */
export function buildParticipantSets(signatories: DocumentSignatory[]) {
  const orderMap = new Map<number, DocumentSignatory[]>();

  for (const s of signatories) {
    const group = orderMap.get(s.signing_order) ?? [];
    group.push(s);
    orderMap.set(s.signing_order, group);
  }

  return Array.from(orderMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([order, group]) => ({
      order,
      role: 'SIGNER',
      memberInfos: group.map((s) => ({
        email: s.signer_email,
        name: s.signer_name,
      })),
    }));
}

/** Upload PDF to Adobe Sign as transient document */
export async function uploadTransientDocument(
  pdfBuffer: ArrayBuffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append('File', new Blob([pdfBuffer], { type: 'application/pdf' }), fileName);
  formData.append('File-Name', fileName);
  formData.append('Mime-Type', 'application/pdf');

  const res = await fetch(`${ADOBE_BASE_URL}/transientDocuments`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.ADOBE_SIGN_ACCESS_TOKEN}` },
    body: formData,
  });

  const data = await res.json();
  return data.transientDocumentId as string;
}

/** Create an Adobe Sign agreement and return agreementId */
export async function createAgreement(params: {
  transientDocumentId: string;
  name: string;
  signatories: DocumentSignatory[];
  expirationDays?: number;
}): Promise<string> {
  const body = {
    name: params.name,
    fileInfos: [{ transientDocumentId: params.transientDocumentId }],
    participantSetsInfo: buildParticipantSets(params.signatories),
    signatureType: 'ESIGN',
    state: 'IN_PROCESS',
    daysUntilSigningDeadline: params.expirationDays ?? 14,
  };

  const res = await fetch(`${ADOBE_BASE_URL}/agreements`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return data.id as string;
}

/** Get the embedded signing URL for a specific signer */
export async function getSigningUrl(
  agreementId: string,
  signerEmail: string
): Promise<string> {
  const res = await fetch(`${ADOBE_BASE_URL}/agreements/${agreementId}/signingUrls`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  const signer = data.signingUrlSetInfos?.[0]?.signingUrls?.find(
    (u: { email: string }) => u.email === signerEmail
  );
  return signer?.esignUrl ?? '';
}

/** Download signed PDF after agreement completes */
export async function downloadSignedPdf(agreementId: string): Promise<ArrayBuffer> {
  const res = await fetch(`${ADOBE_BASE_URL}/agreements/${agreementId}/combinedDocument`, {
    headers: getHeaders(),
  });
  return res.arrayBuffer();
}
```

**Step 4: Run tests**

```bash
pnpm vitest run src/services/__tests__/adobeSignService.test.ts
```

Expected: 2 PASS

**Step 5: Commit**

```bash
git add crm7/src/services/adobeSignService.ts crm7/src/services/__tests__/adobeSignService.test.ts
git commit -m "feat(crm7): Adobe Acrobat Sign service — participant sets, agreement creation, signing URLs"
```

---

### Task 3.2: Adobe Sign webhook handler

**Files:**

- Create: `crm7/supabase/functions/adobe-sign-webhook/index.ts`

**Step 1: Write the webhook handler**

```typescript
// crm7/supabase/functions/adobe-sign-webhook/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req: Request) => {
  // Adobe Sign sends GET for webhook verification
  if (req.method === 'GET') {
    const clientId = req.headers.get('x-adobesign-clientid');
    return new Response(JSON.stringify({ xAdobeSignClientId: clientId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') return new Response('', { status: 405 });

  const payload = await req.json();
  const { event, agreement } = payload;

  if (event !== 'AGREEMENT_ACTION_COMPLETED' || agreement?.status !== 'SIGNED') {
    return new Response('', { status: 200 }); // Ignore non-completion events
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Find the document record
  const { data: record } = await supabase
    .from('document_records')
    .select('*')
    .eq('adobe_agreement_id', agreement.id)
    .single();

  if (!record) return new Response('', { status: 200 });

  // Download signed PDF
  const signedPdfRes = await fetch(
    `https://api.na4.adobesign.com/api/rest/v6/agreements/${agreement.id}/combinedDocument`,
    { headers: { Authorization: `Bearer ${Deno.env.get('ADOBE_SIGN_ACCESS_TOKEN')}` } }
  );
  const signedPdfBuffer = await signedPdfRes.arrayBuffer();

  // Upload signed PDF
  const signedPath = record.storage_path.replace('v1_draft.pdf', 'v1_signed.pdf');
  await supabase.storage.from('documents').upload(signedPath, signedPdfBuffer, {
    contentType: 'application/pdf',
  });

  // Update document record
  await supabase
    .from('document_records')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      signed_storage_path: signedPath,
      adobe_agreement_status: 'SIGNED',
    })
    .eq('id', record.id);

  // Update signatories
  for (const participant of agreement.participantSet ?? []) {
    await supabase
      .from('document_signatories')
      .update({ status: 'signed', signed_at: participant.completionDate })
      .eq('document_record_id', record.id)
      .eq('signer_email', participant.email);
  }

  return new Response('', { status: 200 });
});
```

**Step 2: Deploy**

```bash
supabase functions deploy adobe-sign-webhook --no-verify-jwt
```

**Step 3: Register webhook in Adobe Sign**

In Adobe Sign developer portal → Webhooks → Add webhook:

- URL: `https://<project>.supabase.co/functions/v1/adobe-sign-webhook`
- Events: `AGREEMENT_ACTION_COMPLETED`
- Scope: `ACCOUNT`

**Step 4: Commit**

```bash
git add crm7/supabase/functions/adobe-sign-webhook/index.ts
git commit -m "feat(crm7): Adobe Sign webhook handler — auto-download signed PDF on completion"
```

---

## Phase 4 — Template Registry UI

### Task 4.1: Document Templates page

**Files:**

- Create: `crm7/src/pages/documents/templates/index.tsx`
- Modify: `crm7/src/App.tsx` (add route)

**Step 1: Create the page**

```typescript
// crm7/src/pages/documents/templates/index.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus } from 'lucide-react';
import type { DocumentTemplate } from '@/types/documents';

const CATEGORY_LABELS: Record<string, string> = {
  host_employer: 'Host Employer',
  apprentice: 'Apprentice',
  lifecycle: 'Lifecycle',
  compliance: 'Compliance',
  internal: 'Internal',
};

export default function DocumentTemplatesPage() {
  const { data: templates = [], isLoading } = useQuery<DocumentTemplate[]>({
    queryKey: ['document-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const byCategory = templates.reduce<Record<string, DocumentTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Document Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Templates are authored in Google Docs. Register the Doc ID here to enable merge and signing.
          </p>
        </div>
        <Link href="/documents/templates/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Register Template</Button>
        </Link>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading templates…</p>}

      {Object.entries(byCategory).map(([category, categoryTemplates]) => (
        <section key={category}>
          <h2 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[category] ?? category}</h2>
          <div className="grid gap-3">
            {categoryTemplates.map((template) => (
              <div key={template.id} className="border rounded-lg p-4 flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{template.name}</span>
                    {template.is_system_default && (
                      <Badge variant="secondary">System Default</Badge>
                    )}
                    {!template.google_doc_id && (
                      <Badge variant="destructive">No Google Doc</Badge>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {template.merge_variables.length} merge variables ·{' '}
                    {template.signing_config.length} signatories
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {template.google_doc_id && (
                    <a
                      href={`https://docs.google.com/document/d/${template.google_doc_id}/edit`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-1 h-3 w-3" /> Edit in Docs
                      </Button>
                    </a>
                  )}
                  <Link href={`/documents/templates/${template.id}`}>
                    <Button variant="ghost" size="sm">Settings</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

**Step 2: Register route in App.tsx**

Find the documents section in App.tsx and add:

```typescript
const DocumentTemplates = lazy(() => retryImport(() => import('./pages/documents/templates/index')));
const DocumentTemplatesNew = lazy(() => retryImport(() => import('./pages/documents/templates/new')));
// ... in the route Switch:
<ProtectedRoute path="/documents/templates/new" component={() => <S component={DocumentTemplatesNew} />} routeName="New Template" permission="manage_settings" />
<ProtectedRoute path="/documents/templates" component={() => <S component={DocumentTemplates} />} routeName="Document Templates" permission="view_documents" />
```

**Step 3: Commit**

```bash
git add crm7/src/pages/documents/templates/index.tsx crm7/src/App.tsx
git commit -m "feat(crm7): document templates registry page with Google Docs link"
```

---

### Task 4.2: Generate Document modal

**Files:**

- Create: `crm7/src/components/documents/GenerateDocumentModal.tsx`
- Create: `crm7/src/components/documents/index.ts`

**Step 1: Build the modal**

```typescript
// crm7/src/components/documents/GenerateDocumentModal.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, ExternalLink } from 'lucide-react';
import type { DocumentTemplate, DocumentRecord } from '@/types/documents';

interface Props {
  open: boolean;
  onClose: () => void;
  entityType: DocumentRecord['entity_type'];
  entityId: string;
  entityLabel: string; // e.g. "Jordan Smith" or "Acme Electrical"
}

export function GenerateDocumentModal({ open, onClose, entityType, entityId, entityLabel }: Props) {
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [result, setResult] = useState<{ pdfUrl: string; googleDocUrl?: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery<DocumentTemplate[]>({
    queryKey: ['document-templates', entityType],
    queryFn: async () => {
      const categoryMap: Record<string, string[]> = {
        person: ['apprentice', 'lifecycle'],
        host_employer: ['host_employer'],
        training_contract: ['lifecycle'],
        placement: ['lifecycle'],
      };
      const categories = categoryMap[entityType] ?? [];
      const { data } = await supabase
        .from('document_templates')
        .select('*')
        .in('category', categories)
        .eq('is_active', true)
        .order('name');
      return data ?? [];
    },
    enabled: open,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-document', {
        body: { templateId: selectedTemplateId, entityType, entityId },
      });
      if (error) throw error;
      return data as { pdfUrl: string; googleDocUrl?: string };
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ['document-records', entityId] });
    },
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Generate Document
          </DialogTitle>
          <p className="text-sm text-muted-foreground">For: {entityLabel}</p>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document template…" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">Signing parties</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.signing_config.map((s) => (
                      <Badge key={s.role} variant="outline" className="capitalize">
                        {s.role.replace(/_/g, ' ')} (#{s.order})
                      </Badge>
                    ))}
                    {selectedTemplate.signing_config.length === 0 && (
                      <span className="text-xs text-muted-foreground">GTO only — no external signers</span>
                    )}
                  </div>
                  {selectedTemplate.requires_guardian_if_minor && (
                    <p className="text-xs text-amber-600">+ Parent/guardian required if apprentice is under 18</p>
                  )}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                disabled={!selectedTemplateId || generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate PDF
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="rounded-md bg-green-50 dark:bg-green-950 border border-green-200 p-4 space-y-3">
              <p className="font-medium text-green-800 dark:text-green-200">Document generated successfully</p>
              <div className="flex gap-2">
                <a href={result.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    <ExternalLink className="mr-1 h-3 w-3" /> View PDF
                  </Button>
                </a>
                {result.googleDocUrl && (
                  <a href={result.googleDocUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline">
                      <ExternalLink className="mr-1 h-3 w-3" /> Edit in Google Docs
                    </Button>
                  </a>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button onClick={onClose}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

**Step 2: Create barrel export**

```typescript
// crm7/src/components/documents/index.ts
export { GenerateDocumentModal } from './GenerateDocumentModal';
```

**Step 3: Commit**

```bash
git add crm7/src/components/documents/
git commit -m "feat(crm7): GenerateDocumentModal — template select, merge, PDF view, Google Docs link"
```

---

### Task 4.3: Wire "Generate Document" button to entity pages

**Files:**

- Modify: `crm7/src/pages/people/[id].tsx`
- Modify: `crm7/src/pages/hosts/[id].tsx`

**Step 1: Add to people detail page**

Find the action buttons section in `pages/people/[id].tsx` and add:

```typescript
// Import at top
import { GenerateDocumentModal } from '@/components/documents';

// State inside component
const [generateDocOpen, setGenerateDocOpen] = useState(false);

// Button in header actions
<Button variant="outline" onClick={() => setGenerateDocOpen(true)}>
  <FileText className="mr-2 h-4 w-4" /> Generate Document
</Button>

// Modal at bottom of return
<GenerateDocumentModal
  open={generateDocOpen}
  onClose={() => setGenerateDocOpen(false)}
  entityType="person"
  entityId={id}
  entityLabel={`${person.first_name} ${person.last_name}`}
/>
```

**Step 2: Apply same pattern to hosts/[id].tsx**

Same import + state + button + modal, with `entityType="host_employer"` and appropriate label.

**Step 3: Verify tsc**

```bash
pnpm tsc --noEmit
```

Expected: 0 errors

**Step 4: Commit**

```bash
git add crm7/src/pages/people/[id].tsx crm7/src/pages/hosts/[id].tsx
git commit -m "feat(crm7): wire Generate Document button to people and host detail pages"
```

---

## Phase 5 — Documents Hub

### Task 5.1: Documents hub page

**Files:**

- Create: `crm7/src/pages/documents/hub/index.tsx`
- Modify: `crm7/src/App.tsx`

**Step 1: Create the hub page**

```typescript
// crm7/src/pages/documents/hub/index.tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Clock, CheckCircle2, FolderOpen, ExternalLink } from 'lucide-react';
import type { DocumentRecord } from '@/types/documents';

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent_for_signature: { label: 'Pending Signature', variant: 'default' },
  partially_signed: { label: 'Partially Signed', variant: 'outline' },
  signed: { label: 'Signed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

function DocumentRow({ record }: { record: DocumentRecord }) {
  const badge = STATUS_BADGE[record.status] ?? { label: record.status, variant: 'secondary' };
  return (
    <div className="flex items-center justify-between p-3 border-b last:border-0">
      <div className="flex items-center gap-3">
        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-sm font-medium">{record.template?.name ?? 'Document'}</p>
          <p className="text-xs text-muted-foreground">
            Generated {new Date(record.generated_at).toLocaleDateString('en-AU')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <a href={`/storage/v1/object/authenticated/${record.storage_path}`} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
        </a>
      </div>
    </div>
  );
}

export default function DocumentsHubPage() {
  const { data: records = [] } = useQuery<DocumentRecord[]>({
    queryKey: ['document-records'],
    queryFn: async () => {
      const { data } = await supabase
        .from('document_records')
        .select('*, template:document_templates(name, category)')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const pending = records.filter((r) => ['sent_for_signature', 'partially_signed'].includes(r.status));
  const signed = records.filter((r) => r.status === 'signed');
  const drafts = records.filter((r) => r.status === 'draft');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All generated documents across your organisation.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Clock, label: 'Pending Signature', count: pending.length, color: 'text-amber-500' },
          { icon: CheckCircle2, label: 'Signed', count: signed.length, color: 'text-green-500' },
          { icon: FolderOpen, label: 'Drafts', count: drafts.length, color: 'text-blue-500' },
        ].map(({ icon: Icon, label, count, color }) => (
          <div key={label} className="border rounded-lg p-4 flex items-center gap-3">
            <Icon className={`h-6 w-6 ${color}`} />
            <div>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({records.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="signed">Signed ({signed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="border rounded-lg">
            {records.length === 0 ? (
              <p className="p-6 text-center text-muted-foreground">No documents generated yet.</p>
            ) : records.map((r) => <DocumentRow key={r.id} record={r} />)}
          </div>
        </TabsContent>
        <TabsContent value="pending">
          <div className="border rounded-lg">
            {pending.map((r) => <DocumentRow key={r.id} record={r} />)}
          </div>
        </TabsContent>
        <TabsContent value="signed">
          <div className="border rounded-lg">
            {signed.map((r) => <DocumentRow key={r.id} record={r} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

**Step 2: Register route**

```typescript
// In App.tsx lazy imports:
const DocumentsHub = lazy(() => retryImport(() => import('./pages/documents/hub/index')));
// In route Switch:
<ProtectedRoute path="/documents/hub" component={() => <S component={DocumentsHub} />} routeName="Documents Hub" permission="view_documents" />
```

**Step 3: Add to navigation**

In `crm7/src/config/navigation.ts`, add `/documents/hub` to the Documents section.

**Step 4: Commit**

```bash
git add crm7/src/pages/documents/hub/index.tsx crm7/src/App.tsx crm7/src/config/navigation.ts
git commit -m "feat(crm7): documents hub page — all, pending, signed tabs with status badges"
```

---

## Phase 6 — Plate.js In-App Editor

### Task 6.1: Document editor component

**Files:**

- Create: `crm7/src/components/common/DocumentEditor/index.tsx`
- Create: `crm7/src/components/common/DocumentEditor/plugins.ts`

**Step 1: Create plugins config**

```typescript
// crm7/src/components/common/DocumentEditor/plugins.ts
import { createPlatePlugin } from '@platejs/core/react';
import {
  BoldPlugin, ItalicPlugin, UnderlinePlugin,
} from '@platejs/basic-marks/react';
import { HeadingPlugin } from '@platejs/basic-nodes/react';
import { ParagraphPlugin } from '@platejs/basic-nodes/react';
import { TablePlugin } from '@platejs/table/react';
import { MentionPlugin } from '@platejs/mention/react';

export const editorPlugins = [
  ParagraphPlugin,
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  HeadingPlugin.configure({ options: { levels: [1, 2, 3] } }),
  TablePlugin,
  MentionPlugin.configure({
    options: {
      trigger: '@',
      // Items populated at runtime via mentionables prop
    },
  }),
];
```

**Step 2: Create editor component**

```typescript
// crm7/src/components/common/DocumentEditor/index.tsx
import { Plate, PlateContent, usePlateEditor } from '@platejs/core/react';
import { editorPlugins } from './plugins';
import type { Value } from '@platejs/core';

interface Props {
  value?: Value;
  onChange?: (value: Value) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
}

export function DocumentEditor({ value, onChange, placeholder, readOnly, className }: Props) {
  const editor = usePlateEditor({
    plugins: editorPlugins,
    value: value ?? [{ type: 'p', children: [{ text: '' }] }],
  });

  return (
    <Plate editor={editor} onChange={({ value: v }) => onChange?.(v)} readOnly={readOnly}>
      <PlateContent
        placeholder={placeholder ?? 'Start typing…'}
        className={`min-h-[200px] p-3 focus:outline-none ${className ?? ''}`}
      />
    </Plate>
  );
}
```

**Step 3: Barrel export**

```typescript
// crm7/src/components/common/DocumentEditor/index.ts (if separate barrel needed)
export { DocumentEditor } from './DocumentEditor';
```

**Step 4: Verify it compiles**

```bash
pnpm tsc --noEmit
```

**Step 5: Commit**

```bash
git add crm7/src/components/common/DocumentEditor/
git commit -m "feat(crm7): Plate.js DocumentEditor component — block editing with mentions, tables, formatting"
```

---

### Task 6.2: Wire DocumentEditor to case notes on person detail

**Files:**

- Modify: `crm7/src/pages/people/[id].tsx`
- Modify: `crm7/supabase/migrations/` (add `case_notes` column if missing)

**Step 1: Add migration for case notes column**

```sql
-- 20260304000003_people_case_notes.sql
ALTER TABLE people
  ADD COLUMN IF NOT EXISTS case_notes jsonb;
```

**Step 2: Wire DocumentEditor into Notes tab**

In `pages/people/[id].tsx`, find the Notes tab and replace any textarea with:

```typescript
import { DocumentEditor } from '@/components/common/DocumentEditor';
import type { Value } from '@platejs/core';

// Inside component state:
const [caseNotes, setCaseNotes] = useState<Value | null>(person.case_notes ?? null);

// In Notes tab content:
<div className="border rounded-lg">
  <DocumentEditor
    value={caseNotes ?? undefined}
    onChange={setCaseNotes}
    placeholder="Add case notes…"
    className="min-h-[300px]"
  />
</div>
<div className="flex justify-end mt-2">
  <Button onClick={async () => {
    await supabase.from('people').update({ case_notes: caseNotes }).eq('id', id);
    toast.success('Case notes saved');
  }}>
    Save Notes
  </Button>
</div>
```

**Step 3: Verify and commit**

```bash
pnpm tsc --noEmit
git add crm7/src/pages/people/[id].tsx crm7/supabase/migrations/20260304000003_people_case_notes.sql
git commit -m "feat(crm7): Plate.js case notes editor on person detail page"
```

---

## Phase 7 — Seed Template Data

### Task 7.1: Seed 20 document templates

**Files:**

- Create: `crm7/supabase/seed/document_templates_seed.sql`

**Step 1: Write seed data for all 20 GTO document types**

```sql
-- crm7/supabase/seed/document_templates_seed.sql
-- System-default document templates for all GTO tenants.
-- Google Doc IDs are left NULL — each tenant registers their own Doc ID.
-- Merge variables and signing configs reflect the real GTO document analysis.

-- Ensure there's a system tenant or use the first tenant's ID as placeholder
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN; END IF;

  -- ────────────────────────────────────────────────────────────
  -- CATEGORY: host_employer
  -- ────────────────────────────────────────────────────────────

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id,
    'Host Employer Services Contract (SME — T&Cs + Direct Debit)',
    'Full host employer agreement: Schedule 1 (Particulars), Schedule 2 (Direct Debit), Schedule 3 (T&Cs), Rate Schedule. Includes guarantor provisions.',
    'host_employer', 'contract', NULL,
    '[
      {"key":"GTO_NAME","source":"tenant","field":"name","required":true,"description":"Legal GTO name"},
      {"key":"GTO_ABN","source":"tenant","field":"abn","required":true,"description":"GTO ABN"},
      {"key":"GTO_ADDRESS","source":"tenant","field":"address","required":true,"description":"GTO registered address"},
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host employer legal name"},
      {"key":"HOST_EMPLOYER_ABN","source":"host_employer","field":"abn","required":false,"description":"Host ABN"},
      {"key":"HOST_CONTACT_NAME","source":"host_employer","field":"primary_contact_name","required":true,"description":"Host primary contact"},
      {"key":"HOST_CONTACT_EMAIL","source":"host_employer","field":"primary_contact_email","required":true,"description":"Host contact email"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Contract execution date"}
    ]'::jsonb,
    '[
      {"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"},
      {"role":"host_employer_contact","order":2,"email_source":"host_employer.primary_contact_email","name_source":"host_employer.primary_contact_name"}
    ]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id,
    'Host Employer Rate Quote — Full Disclosure',
    'Client-facing rate schedule with pay rates, charge rates, allowances, and award rules. Signed by both parties.',
    'host_employer', 'letter', NULL,
    '[
      {"key":"GTO_NAME","source":"tenant","field":"name","required":true,"description":"GTO name"},
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host employer name"},
      {"key":"MODERN_AWARD_NAME","source":"rate_schedule","field":"award_name","required":true,"description":"Applicable modern award"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Quote date"}
    ]'::jsonb,
    '[
      {"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"},
      {"role":"host_employer_contact","order":1,"email_source":"host_employer.primary_contact_email","name_source":"host_employer.primary_contact_name"}
    ]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id,
    'Host Employer Safety Assessment (WHS Pre-Placement)',
    'WHS pre-placement risk assessment. Must be completed before any apprentice can be placed.',
    'host_employer', 'form', NULL,
    '[
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host business name"},
      {"key":"QUALIFICATION_NAME","source":"person","field":"qualification_title","required":false,"description":"Trade/qualification covered"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"GTO field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Assessment date"}
    ]'::jsonb,
    '[
      {"role":"host_employer_contact","order":1,"email_source":"host_employer.primary_contact_email","name_source":"host_employer.primary_contact_name"}
    ]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- CATEGORY: apprentice
  -- ────────────────────────────────────────────────────────────

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id,
    'Apprentice/Trainee Contract of Employment + Rate Schedule',
    'Primary employment contract. Covers engagement, wage progression (TBWP/CBWP), leave, allowances, termination, probation, confidentiality, and rate schedule.',
    'apprentice', 'contract', NULL,
    '[
      {"key":"GTO_NAME","source":"tenant","field":"name","required":true,"description":"GTO legal name (employer)"},
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full legal name"},
      {"key":"APPRENTICE_ADDRESS","source":"person","field":"address","required":false,"description":"Apprentice residential address"},
      {"key":"COMMENCEMENT_DATE","source":"training_contract","field":"start_date","required":true,"description":"Employment commencement date"},
      {"key":"NOMINAL_TERM","source":"training_contract","field":"nominal_term_months","required":true,"description":"Nominal term in months (e.g. 48)"},
      {"key":"QUALIFICATION_NAME","source":"person","field":"qualification_title","required":true,"description":"Trade/qualification title"},
      {"key":"MODERN_AWARD_NAME","source":"rate_schedule","field":"award_name","required":true,"description":"Applicable modern award"},
      {"key":"PAY_RATE","source":"rate_schedule","field":"pay_rate_per_hour","required":true,"description":"Starting pay rate per hour"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Assigned SDC/field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Contract signing date"}
    ]'::jsonb,
    '[
      {"role":"apprentice","order":1,"email_source":"people.email","name_source":"people.full_name"},
      {"role":"gto_officer","order":2,"email_source":"staff.email","name_source":"staff.full_name"}
    ]'::jsonb,
    true, 'full', true  -- requires_guardian_if_minor = true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'End of Probation Letter — Successful',
    'Confirms successful completion of probationary period and continuation of employment.',
    'apprentice', 'letter', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"APPRENTICE_FIRST_NAME","source":"person","field":"first_name","required":true,"description":"First name for salutation"},
      {"key":"PROBATION_END_DATE","source":"training_contract","field":"probation_end_date","required":true,"description":"Probation end date"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"SDC who conducted discussion"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"}
    ]'::jsonb,
    '[{"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"}]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Warning Letter — Late Timesheets',
    'Formal written warning for failure to submit timesheets by the required deadline. Apprentice must sign acknowledgement.',
    'apprentice', 'letter', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"APPRENTICE_ADDRESS","source":"person","field":"address","required":false,"description":"Apprentice address"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Issuing field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"}
    ]'::jsonb,
    '[
      {"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"},
      {"role":"apprentice","order":2,"email_source":"people.email","name_source":"people.full_name"}
    ]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Payroll Deduction Authority',
    'Authorises GTO to deduct training fees, tools/equipment costs from wages. Under-18s require parent/guardian signature.',
    'apprentice', 'form', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Form date"}
    ]'::jsonb,
    '[
      {"role":"apprentice","order":1,"email_source":"people.email","name_source":"people.full_name"}
    ]'::jsonb,
    true, 'header_only', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Work Experience Placement Consent Form',
    'Policy acknowledgement and consent for work experience. Parent/guardian signature required if candidate under 18.',
    'apprentice', 'form', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Candidate name"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Form date"}
    ]'::jsonb,
    '[
      {"role":"apprentice","order":1,"email_source":"people.email","name_source":"people.full_name"}
    ]'::jsonb,
    true, 'full', true
  ) ON CONFLICT DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- CATEGORY: lifecycle
  -- ────────────────────────────────────────────────────────────

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Notice of Completion / Suspension / Termination',
    'Records formal end, suspension or termination. Apprentice signs agreement to deduction of outstanding fees. Includes branch/finance sign-off.',
    'lifecycle', 'notice', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"YEAR_LEVEL","source":"training_contract","field":"current_year_level","required":true,"description":"Current year level"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Effective date"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Field officer"}
    ]'::jsonb,
    '[
      {"role":"apprentice","order":1,"email_source":"people.email","name_source":"people.full_name"},
      {"role":"gto_officer","order":2,"email_source":"staff.email","name_source":"staff.full_name"}
    ]'::jsonb,
    false, 'header_only', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Change of Year Letter (to Host Employer)',
    'Notifies host employer of apprentice year-level progression and associated rate change.',
    'lifecycle', 'letter', NULL,
    '[
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host employer name"},
      {"key":"HOST_CONTACT_NAME","source":"host_employer","field":"primary_contact_name","required":true,"description":"Host contact"},
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"YEAR_LEVEL","source":"training_contract","field":"current_year_level","required":true,"description":"New year level"},
      {"key":"CHANGE_OF_YEAR_DATE","source":"training_contract","field":"next_coy_date","required":true,"description":"Change of year effective date"},
      {"key":"PAY_RATE","source":"rate_schedule","field":"pay_rate_per_hour","required":true,"description":"New pay rate"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"}
    ]'::jsonb,
    '[{"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"}]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Cancellation of Apprenticeship Letter (Electrical)',
    'Notifies WA Energy Safety of cancellation. Trade-specific — use only for electrical apprentices.',
    'lifecycle', 'letter', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"EW_NUMBER","source":"training_contract","field":"trade_licence_number","required":true,"description":"Electrical Worker (EW) licence number"},
      {"key":"TRS_NUMBER","source":"training_contract","field":"trs_number","required":true,"description":"Training Record System number"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Signatory field officer"}
    ]'::jsonb,
    '[{"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"}]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Extension of Apprenticeship Letter (Electrical)',
    'Notifies WA Energy Safety of training contract extension. Specify extension period in months.',
    'lifecycle', 'letter', NULL,
    '[
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"EW_NUMBER","source":"training_contract","field":"trade_licence_number","required":true,"description":"EW licence number"},
      {"key":"TRS_NUMBER","source":"training_contract","field":"trs_number","required":true,"description":"TRS number"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Signatory field officer"}
    ]'::jsonb,
    '[{"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"}]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Off-the-Job Training (TAFE) Call-Up Letter',
    'Notifies host employer that apprentice must attend TAFE/RTO training during specified dates.',
    'lifecycle', 'letter', NULL,
    '[
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host employer name"},
      {"key":"HOST_CONTACT_NAME","source":"host_employer","field":"primary_contact_name","required":true,"description":"Host contact"},
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice full name"},
      {"key":"RTO_NAME","source":"training_provider","field":"name","required":true,"description":"RTO/TAFE name"},
      {"key":"RTO_CAMPUS","source":"training_provider","field":"campus","required":false,"description":"Campus location"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"Field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Letter date"}
    ]'::jsonb,
    '[{"role":"gto_officer","order":1,"email_source":"staff.email","name_source":"staff.full_name"}]'::jsonb,
    false, 'full', true
  ) ON CONFLICT DO NOTHING;

  -- ────────────────────────────────────────────────────────────
  -- CATEGORY: compliance
  -- ────────────────────────────────────────────────────────────

  INSERT INTO document_templates (tenant_id, name, description, category, subcategory, google_doc_id,
    merge_variables, signing_config, requires_guardian_if_minor, branding_level, is_system_default)
  VALUES (
    v_tenant_id, 'Performance Appraisal — Apprentice/Trainee',
    'Structured periodic review. 9 performance factors (1–5 rating), apprentice self-assessment, goals. School-based apprentices require copy to school.',
    'compliance', 'assessment', NULL,
    '[
      {"key":"HOST_EMPLOYER_NAME","source":"host_employer","field":"name","required":true,"description":"Host employer name"},
      {"key":"APPRENTICE_NAME","source":"person","field":"full_name","required":true,"description":"Apprentice name"},
      {"key":"QUALIFICATION_NAME","source":"person","field":"qualification_title","required":true,"description":"Qualification/trade"},
      {"key":"FIELD_OFFICER_NAME","source":"staff","field":"full_name","required":true,"description":"GTO field officer"},
      {"key":"LETTER_DATE","source":"system","field":"today","required":true,"description":"Appraisal date"}
    ]'::jsonb,
    '[
      {"role":"host_employer_contact","order":1,"email_source":"host_employer.primary_contact_email","name_source":"host_employer.primary_contact_name"},
      {"role":"apprentice","order":1,"email_source":"people.email","name_source":"people.full_name"},
      {"role":"gto_officer","order":2,"email_source":"staff.email","name_source":"staff.full_name"}
    ]'::jsonb,
    false, 'header_only', true
  ) ON CONFLICT DO NOTHING;

END $$;
```

**Step 2: Apply seed**

```bash
supabase db reset --linked  # or: psql < supabase/seed/document_templates_seed.sql
```

**Step 3: Verify in Studio**

Query `document_templates` — should return 12+ rows with `is_system_default = true`.

**Step 4: Commit**

```bash
git add crm7/supabase/seed/document_templates_seed.sql
git commit -m "feat(crm7): seed 12 system-default document templates (all 5 GTO document categories)"
```

---

## Phase 8 — Verification

### Task 8.1: TypeScript and test suite

**Step 1: Full TypeScript check**

```bash
cd crm7 && pnpm tsc --noEmit
```

Expected: 0 errors

**Step 2: Run full test suite**

```bash
pnpm vitest run
```

Expected: All passing (≥2288 tests), 0 failures

**Step 3: New tests pass**

New tests introduced in this plan:

- `googleDocsService.test.ts` — 3 tests
- `mergeVariableResolver.test.ts` — 4 tests
- `adobeSignService.test.ts` — 2 tests

Total: +9 tests

### Task 8.2: Smoke test end-to-end

1. Open CRM7 → `/documents/templates` — verify template list renders with 12+ system defaults
2. Open a person detail page → click "Generate Document"
3. Select "End of Probation Letter — Successful" → verify merge data preview populates
4. Click "Generate PDF" → verify document appears in `/documents/hub`
5. Open Supabase Storage → verify PDF uploaded to `documents/` bucket
6. Open the Google Doc draft URL → verify merge variables are replaced

### Task 8.3: Commit and close

```bash
git add -A
git commit -m "feat(crm7): complete document lifecycle system — Google Docs + Adobe Sign + Plate.js

- 3 new DB tables: document_templates, document_records, document_signatories (+ RLS)
- Supabase Storage bucket for documents (private, tenant-scoped)
- Google Docs API merge service (buildReplaceRequests, mergeGoogleDocTemplate)
- Merge variable resolver (entity-aware, required field validation)
- generate-document Edge Function
- Adobe Acrobat Sign REST v6 service (participant sets, agreements, signing URLs)
- adobe-sign-webhook Edge Function (auto-download signed PDFs)
- Document Templates registry page (/documents/templates)
- GenerateDocumentModal component (wired to people + hosts pages)
- Documents Hub page (/documents/hub) — all/pending/signed tabs
- Plate.js DocumentEditor component (case notes on people pages)
- 12 system-default document template seeds (5 GTO categories, 20 doc types)
- 9 new unit tests (googleDocsService, mergeVariableResolver, adobeSignService)
- 0 TS errors, all existing tests passing"
```

---

## File Count Summary

| Phase | New Files | Modified |
|-------|-----------|----------|
| 0 (Dependencies) | 0 | 2 |
| 1 (Database) | 3 | 2 |
| 2 (Google Docs) | 5 | 0 |
| 3 (Adobe Sign) | 3 | 0 |
| 4 (Templates UI) | 4 | 2 |
| 5 (Documents Hub) | 2 | 2 |
| 6 (Plate.js Editor) | 3 | 2 |
| 7 (Seed Data) | 1 | 0 |
| **Total** | **21** | **10** |

---

## Key Reference Files

- Design spec: `docs/plans/20260304-crm7-document-lifecycle-design-v1.00F.md`
- `crm7/src/services/documentService.ts` — existing Storage service (14 buckets defined)
- `crm7/src/stores/signatureRequestStore.ts` — existing DocuSign types (superseded by Adobe Sign)
- `crm7/src/pages/people/[id].tsx` — reference for entity detail page patterns
- `crm7/src/App.tsx` — central routing (add all new document routes here)
- `crm7/src/config/navigation.ts` — nav sidebar config
