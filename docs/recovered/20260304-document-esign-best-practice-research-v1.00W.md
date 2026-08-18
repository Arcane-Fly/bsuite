> # ✅ VERDICT: LIVE — this document contains the reversal
>
> **Verdicted 2026-08-17.**
>
> **§9 of this document is where Adobe Acrobat Sign was rejected**, on 2026-03-04. It is the
> reason the two sibling documents dated the same day
> ([implementation plan](./20260304-crm7-document-lifecycle-implementation-plan-v1.00W.md),
> [design](./20260304-crm7-document-lifecycle-design-v1.00D.md)) are dead. Both were written
> before the reversal landed and neither was revised.
>
> The research itself remains sound. The decision it reached was implemented in
> [`20260317-document-esigning-architecture-v1.00A.md`](./20260317-document-esigning-architecture-v1.00A.md),
> which is **shipped** and is the current truth.
>
<!-- G5-VERDICT-BANNER -->
> **VERDICT (REFERENCE-ONLY) recorded 2026-08-17** — full reasoning and evidence in
> [`docs/20260817-recovered-verdict-backlog-v1.00W.md`](../20260817-recovered-verdict-backlog-v1.00W.md).
> The original document is unchanged below this banner.
>
> # ✅ VERDICT: REFERENCE-ONLY — and this is the document that got it right
>
> This is the **decision record that rejected Adobe Acrobat Sign** (§9, 2026-03-04) and selected
> self-hosted signing. It needs no implementation verdict; it is the reason the sibling
> implementation plan in this directory is a trap.
>
> **Its status marker is wrong, though:** it is flagged `W` (Working) when it records a decision
> that was made, acted on, and shipped on 2026-03-17. A `W` marker on a settled ruling invites a
> reader to treat the decision as still open. Read it as approved.
>
> One caveat: §9's own table still lists `document_signatories` as a table of the selected
> architecture. That table **is** live today (with an `adobe_participant_id` column, 0 rows),
> which is why the "no `document_signatories`" claim made elsewhere in this directory is wrong.

---

# Document Lifecycle & E-Signature — Best Practice Research

**Date:** 2026-03-04
**Status:** v1.00W (Working)

> **Marker correction, 2026-08-17.** This body said `v2.00W` against a `v1.00W` filename. The
> filename won and the file was **not** renamed: `docs/recovered/` is a frozen archive — it is
> deliberately exempted from `scripts/drift-scan.mjs`, and `00-READ-THIS-FIRST-corpus-health.md`
> indexes its 33 files by name under an operator ruling. Renaming an indexed frozen-archive file to
> satisfy a version marker would break the index to fix a digit. No `v2` of this research exists in
> the estate.
**Context:** CRM7 document lifecycle system uses Google Docs API for template merging. This research evaluated Adobe, open-source, and self-hosted alternatives for e-signatures and PDF viewing. **Final decision: self-hosted signing with pdf-lib + SHA-256, react-pdf for viewing, Google Docs API for merging. $0/month API costs.**

---

## 1. Questions Investigated

1. What is the current state of Adobe's developer APIs? (URLs moved since training data)
2. Is Adobe Acrobat Sign still the right e-signature provider for a GTO CRM?
3. Should we replace Google Docs template merging with Adobe Document Generation API?
4. Are there better/cheaper alternatives for e-signatures?
5. What is the optimal architecture for GTO document compliance?

---

## 2. Current Adobe Ecosystem (verified March 2026)

Adobe's developer documentation has consolidated under `developer.adobe.com`. The old `adobe.io` paths are deprecated or redirect.

### Adobe Acrobat Services (PDF APIs)

**Portal:** <https://developer.adobe.com/document-services/docs/overview/>

| API | Purpose | Free Tier | Notes |
|-----|---------|-----------|-------|
| **PDF Services API** | Create, combine, export, compress, OCR PDFs | 6-month trial, 1,000 txns | SDKs: Node.js, Java, .NET, Python |
| **Document Generation API** | Merge Word templates + JSON data to PDF/DOCX | Bundled in PDF Services API | Word add-in for template authoring |
| **PDF Extract API** | Extract text, tables, images, structure | Bundled in PDF Services API | ML-powered |
| **PDF Embed API** | Embed PDF viewer in web apps | Unlimited, free forever | JavaScript only, no credentials needed |
| **PDF Accessibility Auto-Tag** | Auto-tag PDFs for accessibility | Bundled in PDF Services API | WCAG compliance |
| **PDF Electronic Seal API** | Tamper-evident seals on PDFs | Bundled in PDF Services API | Certificate-based |

**Important:** Document Generation API is NOT a separate product — it's included when you enable **PDF Services API** in Adobe Developer Console. Same credentials, same quota.

**Pricing:** <https://www.adobe.io/document-services/pricing/main/>

- Free trial: 6-month, 1,000 Document Transactions (covers all bundled APIs)
- After trial: Contact sales for paid plans (volume discounts available)
- Rate limit: 25 RPM, 100MB file size

### Adobe Acrobat Sign API (E-Signatures)

**Portal:** <https://developer.adobe.com/acrobat-sign/>
**REST API v6 Reference:** <https://secure.na1.adobesign.com/public/docs/restapi/v6>

Separate product from PDF Services. Requires Enterprise or Developer subscription.

- REST API v6 (current, stable)
- Free developer account for testing
- Enterprise subscription for production
- Integration Key (never-expiring token) or OAuth 2.0
- Webhooks with client ID verification
- Postman collection available

### Adobe Experience Manager Forms

**Portal:** <https://developer.adobe.com/experience-cloud/experience-manager-apis/>

Enterprise CMS with forms capabilities. Includes Document Generation (sync/async), Document Manipulation, and Adaptive Forms Runtime. **Far too heavy for CRM7** — this is an enterprise CMS platform, not a standalone API.

**Recommendation:** Reject. Overkill for this project.

---

## 3. Architecture Evaluation: Template Merging

### Current: Google Docs API

The `generate-document` Edge Function copies a Google Doc template, runs `batchUpdate` with `replaceAllText` requests, and exports as PDF.

| Factor | Assessment |
|--------|-----------|
| Template format | Google Docs (cloud-hosted) |
| Merge syntax | `{{VARIABLE}}` |
| Template authoring | Google Docs UI (familiar to most) |
| Auth complexity | Service account JWT (custom implementation in Edge Function) |
| Output quality | Good — native Google PDF export |
| Free tier | No explicit free tier; Google Workspace required |
| Edge Function compat | Works via raw `fetch()` (already implemented) |
| Template storage | Google Drive (external dependency) |
| Signing integration | None — separate step |

### Alternative: Adobe Document Generation API

| Factor | Assessment |
|--------|-----------|
| Template format | Microsoft Word (.docx) |
| Merge syntax | `{{VARIABLE}}` (identical!) |
| Template authoring | Word + Adobe Document Tagger add-in |
| Auth complexity | API credentials (simpler than Google SA JWT) |
| Output quality | High — native PDF generation |
| Free tier | 500 transactions/month (generous for GTO) |
| Edge Function compat | REST API — would work from Deno with `fetch()` |
| Template storage | Your own storage (Supabase Storage for .docx files) |
| Signing integration | Built-in Acrobat Sign text tags in templates |

### Comparison

| Criteria | Google Docs | Adobe Doc Gen | Winner |
|----------|-------------|---------------|--------|
| Already implemented | Yes | No | Google |
| Template authoring UX | Good (browser-based) | Good (Word + add-in) | Tie |
| Free tier | No | 500/month | Adobe |
| External dependencies | Google Cloud project + Drive | Adobe API credentials | Adobe (simpler) |
| Signing integration | None | Built-in | Adobe |
| Template portability | Tied to Google Drive | .docx files in your storage | Adobe |
| Edge Function complexity | Custom JWT + 3 API calls | 1 REST call | Adobe |

### Recommendation: Keep Google Docs for Now, Consider Adobe Doc Gen for v2

**Rationale:**

- Google Docs implementation is working and tested
- Switching mid-feature adds risk with no immediate business value
- Adobe Doc Gen is a better long-term choice because:
  - Eliminates Google Cloud dependency
  - Built-in Acrobat Sign signature field tags
  - Templates stored in Supabase (not external Google Drive)
  - Simpler auth (no custom JWT construction)
  - Free tier covers GTO volume
- **Migration path:** Convert Google Doc templates to .docx (straightforward), update Edge Function to call Adobe API

---

## 4. E-Signature Provider Evaluation

### CRM7 GTO Requirements

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Legally binding e-signatures | Critical | ESIGN Act, Electronic Transactions Act (AU) |
| Audit trail | Critical | GTO compliance, ASQA audits |
| Multi-party sequential signing | High | Apprentice, host employer, GTO officer, guardian |
| Webhook notifications | High | Real-time status updates |
| Embedded signing URLs | High | In-app signing experience |
| PDF download of signed docs | High | Archive in Supabase Storage |
| Template/form fields | Medium | Pre-fill signer info |
| REST API quality | Medium | Clean integration with Edge Functions |
| Australian data residency | Low | Nice-to-have, not required |
| Cost | Medium | Small GTO, moderate volume |

### Provider Comparison

| Provider | Legal Validity | Audit Trail | Multi-party | Webhooks | Embedded | API Quality | Free Tier | Cost |
|----------|---------------|-------------|-------------|----------|----------|-------------|-----------|------|
| **Adobe Acrobat Sign** | Excellent | Excellent | Yes | Yes | Yes | Good (v6 REST) | Dev account | Enterprise: contact sales |
| **DocuSign** | Excellent | Excellent | Yes | Yes | Yes | Excellent | No | $40+/user/mo |
| **Dropbox Sign** | Good | Good | Yes | Yes | Yes | Good | Test mode | Contact sales |
| **DocuSeal** | Good (ESIGN/UETA) | Basic | Yes | Yes | Yes | Clean REST | Self-hosted free | $20/mo + $0.20/sig |
| **BoldSign** | Good | Good | Yes | Yes | Yes | Good | Limited | $49/mo |
| **SignNow** | Good | Good | Yes | Yes | Yes | Decent | No | Contact sales |

### Detailed Assessment

#### Adobe Acrobat Sign (Current Choice)

**Strengths:**

- Enterprise-grade legal validity and compliance
- Comprehensive audit trail (critical for GTO/ASQA)
- Mature REST API v6 with good documentation
- Integration Key auth (never expires — ideal for Edge Functions)
- Built-in Acrobat Sign integration with Document Generation API
- Established vendor, unlikely to disappear

**Weaknesses:**

- Enterprise pricing is opaque (contact sales)
- Shard-based architecture adds complexity
- Developer account is limited for production use
- No published per-signature pricing

**Applicability:** High — the current implementation works. Enterprise subscription is the main cost barrier.

#### DocuSeal (Open-Source Alternative)

**Strengths:**

- Self-hosted on Railway (BSuite already uses Railway for braden)
- Zero licensing cost (open-source, MIT license)
- Clean REST API with webhooks
- React embedding SDK
- Full control over data (Australian data residency by hosting in AU)

**Weaknesses:**

- Less established legal standing than Adobe/DocuSign
- No enterprise-grade audit trail out of the box
- Self-hosted = you maintain it
- No built-in PDF generation or template merging
- Smaller community, fewer integrations

**Applicability:** Medium — viable for cost-sensitive deployment, but GTO compliance audits may question a self-hosted open-source e-signature tool vs. an established vendor.

#### DocuSign

**Strengths:** Market leader, best API documentation, deepest integration ecosystem.
**Weaknesses:** Most expensive, no free tier, complex pricing.
**Applicability:** Low — overkill and expensive for a single-GTO CRM.

### Recommendation: ~~Stay with Adobe Acrobat Sign~~ → SUPERSEDED

> **Updated 2026-03-04:** After further analysis, the self-hosted approach was selected.
> See Section 9 for the final architecture decision.

The original recommendation was to stay with Adobe Sign for legal defensibility. However, a key insight changed this: **GTOs do not create apprenticeship contracts** (AASN/AASS does). The GTO only generates and signs its own employment documents — policies, employment contracts, host agreements, charge rates, WHS docs, warning letters, etc. These are standard employment documents under the AU Electronic Transactions Act 1999, which does **not** require enterprise-grade e-signatures. A properly implemented audit trail (signer identity, timestamp, IP, SHA-256 hash) satisfies the three requirements: Identity, Intent, and Integrity.

---

## 5. PDF Viewing in CRM7

### Current: Raw download link

The `generate-document` Edge Function returns a `pdfUrl` pointing to Supabase Storage. Users download the PDF.

### Alternative: Adobe PDF Embed API

- **Free, unlimited** — no cost
- JavaScript library embeds a full PDF viewer in the browser
- Supports annotations, commenting, analytics
- Works with any PDF (not just Adobe-generated)

### ~~Recommendation: Adopt PDF Embed API~~ → SUPERSEDED

> **Updated 2026-03-04:** react-pdf (Mozilla pdf.js) selected instead.
> No external API dependency. No domain-restricted credentials. Same UX.

**Implementation:** `react-pdf` package provides a native React PDF viewer powered by Mozilla's pdf.js. Supports pagination, zoom, text selection, and annotation layers. Zero external API calls.

---

## 6. Summary of Recommendations (FINAL)

| # | Recommendation | Priority | Status | Impact |
|---|---------------|----------|--------|--------|
| 1 | **Self-hosted signing** (pdf-lib + SHA-256 + react-signature-canvas) | P1 | ✅ Implemented | $0/month, legally sufficient |
| 2 | **Keep Google Docs API** for template merging | - | ✅ Already working | No change needed |
| 3 | **react-pdf** (Mozilla pdf.js) for in-app PDF viewing | P1 | ✅ Implemented | No external API, better DX |
| 4 | **document_audit_logs** table for legal audit trail | P1 | ✅ Migration created | ESIGN Act compliance |
| 5 | ~~Adobe Acrobat Sign~~ | - | ❌ Rejected | Not needed for GTO employment docs |
| 6 | ~~Adobe PDF Embed API~~ | - | ❌ Replaced by react-pdf | Domain-restricted, unnecessary |
| 7 | ~~Adobe Document Generation API~~ | - | ❌ Rejected | Google Docs is sufficient |

---

## 7. Environment Variables Required (Production)

### Google Cloud (for template merging) — ✅ CONFIGURED via Workload Identity Federation

Supabase secrets (all non-sensitive metadata — no static keys):

```
GCP_PROJECT_NUMBER=111744121676
GCP_WIF_POOL_ID=supabase-edge-functions
GCP_WIF_PROVIDER_ID=supabase-auth
GCP_SA_EMAIL=firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com
```

- Google Cloud project: `claritycrm-hpofn`
- Service account: `firebase-adminsdk-fbsvc@claritycrm-hpofn.iam.gserviceaccount.com` (key-less — WIF only)
- WIF pool: `supabase-edge-functions` (trusts Supabase OIDC issuer)
- APIs enabled: Google Docs API ✅, Google Drive API ✅, IAM Credentials API ✅

### Adobe (NOT USED — credentials exist but are not consumed)

Adobe PDF Services and PDF Embed credentials were created during evaluation but are **not part of the final architecture**. They remain in `.env.local` for reference but are dead config.

---

## 9. Final Architecture Decision (2026-03-04)

### Why Self-Hosted Signing?

The key insight: **GTOs do not create apprenticeship training contracts.** The Australian Apprenticeship Support Network (AASN/AASS) creates and manages training contracts. The GTO only:

1. **Stores** apprenticeship contracts received from AASN (in Supabase Storage)
2. **Generates & signs** its own employment documents — policies, employment contracts, payroll deduction authorities, WHS docs, warning letters, performance reviews
3. **Generates & signs** host employer documents — host agreements, charge rate quotes, safety assessments
4. **Generates & signs** trainee/labour hire worker documents — same as above

These are standard employment documents, not regulated training contracts. The AU Electronic Transactions Act 1999 requires three things for a valid e-signature:

| Requirement | How We Satisfy It |
|-------------|------------------|
| **Identity** | Signer name, email, IP address, user agent recorded |
| **Intent** | Explicit consent checkbox ("I agree to use electronic signatures…") |
| **Integrity** | SHA-256 hash of final signed PDF stored in database; any modification invalidates the hash |

### Architecture Stack

| Component | Technology | Cost | Files |
|-----------|-----------|------|-------|
| Template merging | Google Docs API | $0 | `supabase/functions/generate-document/index.ts` |
| PDF viewing | react-pdf (Mozilla pdf.js) | $0 | `src/components/documents/PdfViewer.tsx` |
| E-signature capture | react-signature-canvas | $0 | `src/components/documents/SignDocumentFlow.tsx` |
| PDF stamping + hashing | pdf-lib + Web Crypto API | $0 | `src/lib/documentSigner.ts` |
| Document storage | Supabase Storage | $0 | Existing |
| Audit trail | document_audit_logs table | $0 | Migration `20260304000005` |
| Signer tracking | document_signatories table | $0 | Existing |

### Database Tables (Document Lifecycle)

| Table | Purpose |
|-------|--------|
| `document_templates` | Template definitions with Google Doc IDs and merge variable specs |
| `document_records` | Generated documents with status lifecycle, storage paths, hash |
| `document_signatories` | Per-signer tracking with role, order, status, IP, user agent |
| `document_audit_logs` | Immutable event log (GENERATED, VIEWED, SIGNED, etc.) |

### Signing Flow

1. GTO officer generates document via `generate-document` Edge Function (Google Docs merge → PDF → Supabase Storage)
2. Document record created with status `draft`, signatories created per `signing_config`
3. Signer opens `SignDocumentFlow` — reviews PDF in react-pdf viewer
4. Signer draws signature on canvas, checks consent box
5. Client-side: pdf-lib stamps signature image + audit trail page onto PDF
6. Client-side: SHA-256 hash of final PDF computed
7. Signed PDF uploaded to Supabase Storage, record updated, audit log created
8. If all signatories complete → document status becomes `signed`

---

## 10. Open Items

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | Apply migration `20260304000005` to production | P1 | Pending |
| 2 | Deploy updated `generate-document` Edge Function | P1 | Pending |
| 3 | Create Google Docs templates for standard GTO documents | P2 | Not started |
| 4 | Wire `SignDocumentFlow` into document detail pages | P2 | Not started |
| 5 | Implement email notifications when document is ready for signing | P3 | Not started |
| 6 | Consider removing dead Adobe env vars from `.env.local` | P4 | Optional |
| 7 | Multi-party sequential signing UX (next signer notification) | P3 | Not started |

---

## 8. References

1. Adobe Acrobat Sign Developer Portal — <https://developer.adobe.com/acrobat-sign/>
2. Adobe Acrobat Sign REST API v6 — <https://secure.na1.adobesign.com/public/docs/restapi/v6>
3. Adobe Document Generation API — <https://developer.adobe.com/document-services/docs/overview/>
4. Adobe PDF Services Pricing — <https://www.adobe.io/document-services/pricing/main/>
5. Adobe PDF Embed API — <https://developer.adobe.com/document-services/docs/overview/pdf-embed-api>
6. Adobe Sign Embed Partner Guide — <https://developer.adobe.com/acrobat-sign/docs/overview/embedpartner/>
7. Adobe Experience Manager APIs — <https://developer.adobe.com/experience-cloud/experience-manager-apis/>
8. DocuSeal (open-source alternative) — <https://www.docuseal.com>
9. Google Docs API Merge Guide — <https://developers.google.com/workspace/docs/api/how-tos/merge>
10. E-Signature API Comparison 2026 — <https://www.turbodocx.com/best-esignature-api-comparison>
11. pdf-lib (PDF manipulation in JS) — <https://pdf-lib.js.org>
12. react-pdf (Mozilla pdf.js React wrapper) — <https://www.npmjs.com/package/react-pdf>
13. react-signature-canvas — <https://www.npmjs.com/package/react-signature-canvas>
14. AU Electronic Transactions Act 1999 — <https://www.legislation.gov.au/C2004A00553/latest/text>
15. Web Crypto API (SHA-256) — <https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest>
