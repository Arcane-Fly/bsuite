> # ✅ VERDICT: CURRENT TRUTH — shipped, and this is the one to build on
>
> **Verdicted 2026-08-17 against live code and the live production database.**
>
> This document supersedes both same-vendor documents dated 2026-03-04 in this directory.
> Measured in production on 2026-08-17: `document_records` (1 row), `document_audit_logs`,
> `document_templates` (1 row) and `signature_requests` (5 rows) all exist; no Adobe Sign
> service, module or edge function exists in any submodule.
>
> **One correction to the corpus-health note** (`00-READ-THIS-FIRST-corpus-health.md` §1),
> which says the shipped shape has no `document_signatories`: that table **does** exist in
> production, recreated 2026-07-30 by `crm7/supabase/migrations/20260730231100_recreate_document_signing.sql`
> for a `SignDocumentFlow.tsx` that has since been deleted from `crm7/src`. It holds **0 rows**
> and no application code reads or writes it. Whether it is retained or dropped is an open
> question recorded in `docs/20260817-coverage-gap-closure-v1.00W.md` §G5.
>
<!-- G5-VERDICT-BANNER -->
> **VERDICT (SUPERSEDED) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ⚠️ VERDICT: SUPERSEDED (in its evidence, not its decision)
>
> **The architectural decision below is still correct** — self-hosted signing, zero vendor
> dependency, is the live intent. **Its evidence block is now false**, and this document is
> marked `A` (Approved), so it is read as settled fact.
>
> Measured 2026-08-17 against `crm7`:
>
> | This document cites as proof | Reality |
> |---|---|
> | `src/lib/documentSigner.ts` | **Deleted** by `crm7#1665` — *"delete … the unreachable signing UI"* |
> | `src/components/documents/SignDocumentFlow.tsx` | **Deleted** by the same commit |
> | `src/pages/documents/signatures.tsx` | Still present (positive control — this probe can find files that exist) |
> | *"Adobe Sign webhook retirement crm7#687 CLOSED"* | **Closed but not done.** The function is **ACTIVE in production today** (v42, redeployed 2026-08-16) and its source was restored to the repo by `bsuite#1955`. |
>
> **So the inversion is complete: the selected replacement was deleted from `crm7` as
> unreachable, while the rejected vendor's endpoint is live.** The surviving self-hosted
> implementation lives in **conduit** (`conduit/src/lib/esign/documentSigner.ts`), not crm7.
>
> Do not cite this document's file list as proof that signing is shipped in crm7. See the index
> and `crm7#1476`.

---

# Document E-Signing Architecture — CRM7

**Status:** Approved (v1.00A) — implemented and shipped; re-marked W→A in the 2026-06-11 docs closure audit (evidence: `src/lib/documentSigner.ts`, `src/components/documents/SignDocumentFlow.tsx`, `src/pages/documents/signatures.tsx`; Adobe Sign webhook retirement crm7#687 CLOSED)  
**Replaces:** Adobe Sign, DocuSeal, Adobe PDF Services (all removed — zero vendor dependency)  
**Legal basis:** Australian Electronic Transactions Act 1999

---

## Decision Rationale

For internal GTO and recruitment documents (policies, standard employment contracts, host agreements), heavy regulated e-signature providers are unnecessary overhead. By combining three open-source/free components, CRM7 achieves an enterprise-grade document lifecycle at **$0/month in API costs**:

| Component           | Technology                            | Purpose                                   |
| ------------------- | ------------------------------------- | ----------------------------------------- |
| Template authoring  | Google Docs API + WIF                 | Browser-based merge with `{{VAR}}` tokens |
| PDF viewing         | `react-pdf` (Mozilla pdf.js)          | Native React viewer, no Adobe Embed API   |
| Signing + integrity | `pdf-lib` + `crypto.subtle` SHA-256   | AU ETA 1999 compliant in-browser stamping |
| Storage             | Supabase Storage (`documents` bucket) | Unsigned + signed PDFs                    |
| Audit trail         | `document_audit_logs` table           | IP, user agent, timestamps per action     |

> **Note:** This architecture is appropriate for internal operational documents (our **own** e-sign — no third-party signing vendor). Regulated AASN training-contract lodgement still goes through the **RAMS** API (the AASN API), which is a separate regulated step performed _after_ in-house e-signature — not an e-signature vendor.

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

| Secret                | Value                                                              |
| --------------------- | ------------------------------------------------------------------ |
| `GCP_PROJECT_NUMBER`  | `111744121676`                                                     |
| `GCP_WIF_POOL_ID`     | `supabase-edge-functions`                                          |
| `GCP_WIF_PROVIDER_ID` | `supabase-auth`                                                    |
| `GCP_SA_EMAIL`        | `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` |

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
2. **Intent** — Explicit checkbox consent: _"I agree to use electronic records and signatures"_
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
})
```

---

## Removed / Replaced

| Removed                                             | Replaced by                                  |
| --------------------------------------------------- | -------------------------------------------- |
| `adobeSignService.ts`                               | `documentSigner.ts` + `SignDocumentFlow.tsx` |
| Adobe Embed API (`VITE_ADOBE_PDF_EMBED_CLIENT_ID`)  | `PdfViewer.tsx` (react-pdf / pdf.js)         |
| Adobe PDF Services (`ADOBE_PDF_SERVICES_CLIENT_ID`) | Google Docs export → PDF (edge function)     |
| `GOOGLE_SERVICE_ACCOUNT_JSON` secret                | WIF (Workload Identity Federation)           |

The old Adobe credentials remain in `.env.local` for reference but are not consumed by any active code.
