# Document E-Signing Architecture — CRM7

**Status:** Working (v1.00W)  
**Replaces:** Adobe Sign, DocuSeal, Adobe PDF Services (all removed — zero vendor dependency)  
**Legal basis:** Australian Electronic Transactions Act 1999

---

## Decision Rationale

For internal GTO and recruitment documents (policies, standard employment contracts, host agreements), heavy regulated e-signature providers are unnecessary overhead. By combining three open-source/free components, CRM7 achieves an enterprise-grade document lifecycle at **$0/month in API costs**:

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Template authoring | Google Docs API + WIF | Browser-based merge with `{{VAR}}` tokens |
| PDF viewing | `react-pdf` (Mozilla pdf.js) | Native React viewer, no Adobe Embed API |
| Signing + integrity | `pdf-lib` + `crypto.subtle` SHA-256 | AU ETA 1999 compliant in-browser stamping |
| Storage | Supabase Storage (`documents` bucket) | Unsigned + signed PDFs |
| Audit trail | `document_audit_logs` table | IP, user agent, timestamps per action |

> **Note:** This architecture is appropriate for internal operational documents. AASN training contract execution still requires the regulated TYIMS/AASN process.

---

## Key Files

```
src/
  lib/
    documentSigner.ts           # pdf-lib stamper + SHA-256 hash
  components/
    documents/
      PdfViewer.tsx             # react-pdf viewer (replaces Adobe Embed)
      SignDocumentFlow.tsx       # End-to-end signing UI
supabase/
  functions/
    generate-document/
      index.ts                  # Google Docs merge → PDF export (WIF auth)
  migrations/
    20260304000005_document_signing_audit.sql   # document_hash + audit logs
```

---

## Architecture Flow

```
1. Staff clicks "Generate Document" in CRM7
         ↓
2. Edge function: supabase/functions/generate-document
   - Authenticates to Google via WIF (no static keys)
   - Copies Google Docs template
   - Merges {{VAR}} tokens with CRM record data
   - Exports as PDF
   - Uploads to Supabase Storage: unsigned/{recordId}/file.pdf
   - Creates document_records row (status: pending_signature)
   - Deletes temporary Google Doc copy
         ↓
3. Signer opens SignDocumentFlow in browser
   - PdfViewer renders PDF via Mozilla pdf.js
   - User draws signature on canvas
   - User checks consent checkbox
         ↓
4. Browser-side signing (documentSigner.ts)
   - pdf-lib embeds signature image on last page
   - Appends "Certificate of Completion" audit page:
       * Signer name + email
       * IP address (fetched from ipify)
       * Timestamp
       * AU ETA 1999 consent statement
   - SHA-256 hashes final PDF bytes (tamper evidence)
         ↓
5. Upload + record update
   - Signed PDF → Supabase Storage: signed/{file}.pdf
   - document_records updated: status=signed, document_hash, signed_at
   - document_audit_logs INSERT: action=SIGNED, ip, user_agent
```

---

## Google Cloud Authentication (WIF — no static keys)

The edge function uses Workload Identity Federation. **Never use `GOOGLE_SERVICE_ACCOUNT_JSON`.**

```
Supabase JWT → Google STS token exchange → SA impersonation → short-lived access token
```

Required Supabase secrets (non-sensitive metadata only):

| Secret | Value |
|--------|-------|
| `GCP_PROJECT_NUMBER` | `111744121676` |
| `GCP_WIF_POOL_ID` | `supabase-edge-functions` |
| `GCP_WIF_PROVIDER_ID` | `supabase-auth` |
| `GCP_SA_EMAIL` | `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` |

See `AGENTS.md` → "Google Cloud Authentication" for full WIF setup details.

---

## Database Schema

```sql
-- Document records (created by generate-document edge function)
CREATE TABLE document_records (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id           UUID NOT NULL,          -- Links to apprentice, employer, etc.
    title               TEXT NOT NULL,
    unsigned_file_path  TEXT NOT NULL,          -- Supabase Storage path
    signed_file_path    TEXT,
    status              TEXT DEFAULT 'pending_signature',  -- pending_signature | signed
    signer_name         TEXT NOT NULL,
    signer_email        TEXT NOT NULL,
    document_hash       TEXT,                   -- SHA-256 of final signed PDF
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    signed_at           TIMESTAMPTZ
);

-- Legal audit trail (one row per lifecycle event)
CREATE TABLE document_audit_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  UUID REFERENCES document_records(id) ON DELETE CASCADE,
    action       TEXT NOT NULL,   -- GENERATED | VIEWED | SIGNED
    ip_address   TEXT,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Legal Compliance (AU Electronic Transactions Act 1999)

The Certificate of Completion page appended to every signed PDF satisfies the three ETA 1999 requirements:

1. **Identity** — Signer name, email, and IP address are recorded
2. **Intent** — Explicit checkbox consent: *"I agree to use electronic records and signatures"*
3. **Integrity** — SHA-256 hash stored in `document_records.document_hash`; any post-signing modification changes the hash

---

## Template Authoring (Google Docs)

Templates use `{{VARIABLE_NAME}}` tokens. The edge function performs a `batchUpdate` replaceAllText for each key in `mergeData`.

Example merge call:
```typescript
await supabase.functions.invoke('generate-document', {
  body: {
    templateId: 'GOOGLE_DOC_ID',
    mergeData: {
      APPRENTICE_NAME: 'Jane Smith',
      EMPLOYER_NAME: 'Acme Pty Ltd',
      START_DATE: '1 July 2026',
      AWARD_CODE: 'MA000010',
    },
    recordId: apprenticeId,
    outputName: 'Host_Agreement_JaneSmith',
    signerName: 'Jane Smith',
    signerEmail: 'jane@example.com',
  },
});
```

---

## Removed / Replaced

| Removed | Replaced by |
|---------|------------|
| `adobeSignService.ts` | `documentSigner.ts` + `SignDocumentFlow.tsx` |
| Adobe Embed API (`VITE_ADOBE_PDF_EMBED_CLIENT_ID`) | `PdfViewer.tsx` (react-pdf / pdf.js) |
| Adobe PDF Services (`ADOBE_PDF_SERVICES_CLIENT_ID`) | Google Docs export → PDF (edge function) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` secret | WIF (Workload Identity Federation) |

The old Adobe credentials remain in `.env.local` for reference but are not consumed by any active code.
