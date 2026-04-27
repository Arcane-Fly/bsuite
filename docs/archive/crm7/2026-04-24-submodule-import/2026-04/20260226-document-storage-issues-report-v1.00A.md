# Document Storage Implementation Issues

**Created:** 2026-02-26
**Baseline Commit:** 3df166b
**Branch:** feature/document-storage-system

## Critical Issues (BLOCK PRODUCTION)

### SEC-001: Encryption Not Implemented
- **Severity:** Critical
- **Status:** OPEN - Blocks production deployment
- **Area:** `src/services/documentService.ts:400-405`
- **Issue:** Sensitive documents (TFN, bank details, medical records) are flagged but NOT encrypted before upload
- **Risk:** Privacy Act 1988 violation, TFN declarations stored in plaintext
- **Evidence:**
```typescript
if (isSensitiveDoc) {
  // TODO: Implement encryption
  console.warn('Document requires encryption but encryption not yet implemented');
}
```
- **Proposed Fix:**
  1. Implement `EncryptionService` class with AES-256-GCM
  2. Use per-tenant encryption keys with PBKDF2 key derivation
  3. Store IV, auth tag, and salt in metadata
  4. Encrypt before upload, decrypt after download
- **Reference:** See `DOCUMENT_STORAGE_IMPLEMENTATION.md` Phase 1 for encryption service implementation
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### QUAL-001: No Unit Tests
- **Severity:** Critical
- **Status:** OPEN - Blocks production deployment
- **Area:** `src/services/documentService.ts` (entire file, 734 lines)
- **Issue:** Zero test coverage for critical document service
- **Risk:** Bugs in production, regressions undetected, data loss
- **Proposed Fix:**
  1. Create `src/services/documentService.test.ts`
  2. Mock Supabase client
  3. Test all 8 public methods (upload, download, delete, verify, etc.)
  4. Test error conditions (invalid tenant, oversized files, bad MIME types)
  5. Test sensitive document detection
  6. Test file path sanitization edge cases
  7. Achieve 80%+ coverage
- **Assigned:** Unassigned
- **Target:** Phase 1 (Week 1)

---

## High Severity Issues (Fix Before Beta)

### SEC-003: File Path Sanitization Improved (FIXED ✅)
- **Severity:** High
- **Status:** FIXED
- **Fix Applied:** Added validation for path traversal patterns, random suffix for collision prevention
- **Commit:** Pending

### SEC-004: RLS Policies Lack Role Validation
- **Severity:** High
- **Status:** OPEN
- **Area:** `supabase/migrations/20260226_create_document_storage.sql` (all RLS policies)
- **Issue:** RLS policies trust `auth.jwt() ->> 'role'` without validating against allowed roles enum
- **Risk:** Malicious JWT with `role: 'admin'` bypasses access restrictions
- **Proposed Fix:**
  1. Create `allowed_roles` table with enum values
  2. Create `validate_user_role()` function
  3. Update all RLS policies to call `validate_user_role(auth.jwt() ->> 'role')`
- **Assigned:** Unassigned
- **Target:** Phase 1 (Week 1)

### REL-001: Partial Upload Cleanup Not Atomic
- **Severity:** High
- **Status:** OPEN
- **Area:** `src/services/documentService.ts:420-424`
- **Issue:** If metadata creation fails, storage cleanup is best-effort (may fail)
- **Risk:** Orphaned files in storage, wasted storage costs
- **Evidence:**
```typescript
if (metadataError) {
  // Cleanup: delete uploaded file if metadata creation fails
  await supabase.storage.from(bucket).remove([storagePath]);
  return { success: false, error: `Metadata creation failed: ${metadataError.message}` };
}
```
- **Proposed Fix:**
  - Option A: Supabase Edge Function for atomic operation (upload + metadata in transaction)
  - Option B: Add cleanup cron job to delete orphaned files (storage path not in metadata table)
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### REL-002: File Size Validation After Memory Load (FIXED ✅)
- **Severity:** High
- **Status:** FIXED
- **Fix Applied:** Validate file.size before processing to prevent OOM
- **Commit:** Pending

### QUAL-002: SQL Migration Partially Idempotent (PARTIALLY FIXED ✅)
- **Severity:** High
- **Status:** PARTIALLY FIXED
- **Fix Applied:** Added documentation note, bucket inserts already idempotent with ON CONFLICT
- **Remaining:** RLS policies not idempotent (fail on re-run)
- **Proposed Fix:** Wrap each CREATE POLICY with DROP POLICY IF EXISTS (42 policies total)
- **Assigned:** Unassigned
- **Target:** Phase 1 (Week 1)

---

## Medium Severity Issues (Enhancement)

### SEC-005: No Access Audit Trail
- **Severity:** Medium
- **Status:** OPEN
- **Area:** Database schema
- **Issue:** No tracking of who accessed sensitive documents
- **Risk:** Can't audit unauthorized TFN/medical record access for Privacy Act compliance
- **Proposed Fix:**
  1. Create `document_access_log` table with columns: `id`, `document_id`, `user_id`, `accessed_at`, `action`, `ip_address`
  2. Add trigger on document download to log access
  3. Create audit report view for compliance
- **Assigned:** Unassigned
- **Target:** Phase 3 (Week 3)

### REL-003: Concurrent Upload Race Condition (FIXED ✅)
- **Severity:** Medium
- **Status:** FIXED
- **Fix Applied:** Added random suffix to filename to prevent millisecond collisions
- **Commit:** Pending

### REL-004: Download Decryption Stub
- **Severity:** Medium
- **Status:** BLOCKED by SEC-001
- **Area:** `src/services/documentService.ts:462-465`
- **Issue:** Decryption marked as TODO, encrypted documents can't be downloaded
- **Proposed Fix:** Implement decryption when encryption service (SEC-001) is complete
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### PERF-001: Missing Compound Database Indexes
- **Severity:** Medium
- **Status:** OPEN
- **Area:** `document_metadata` table indexes
- **Issue:** Missing compound index for common query: (tenant_id, entity_type, entity_id)
- **Risk:** Slow queries as document count grows (N documents × filter = O(N) scan)
- **Proposed Fix:**
```sql
CREATE INDEX idx_document_metadata_entity_compound
ON document_metadata(tenant_id, entity_type, entity_id);

CREATE INDEX idx_document_metadata_category_compound
ON document_metadata(tenant_id, document_category);
```
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### PERF-002: Expiring Documents View Not Optimized
- **Severity:** Medium
- **Status:** OPEN
- **Area:** `documents_expiring_soon` view
- **Issue:** View scans all documents to find expiring ones
- **Risk:** Slow as document count grows
- **Proposed Fix:**
  - Option A: Materialized view with daily refresh
  - Option B: Index on `expiry_date` already exists, add partial index for active expiries
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### UX-001: Generic Error Messages (PARTIALLY FIXED ✅)
- **Severity:** Medium
- **Status:** PARTIALLY FIXED
- **Fix Applied:** Added error codes (FILE_TOO_LARGE, INVALID_MIME_TYPE, TENANT_REQUIRED, FILE_EMPTY)
- **Remaining:** Other error messages still generic (upload errors, storage errors)
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### UX-002: Document Categories Not Validated at Runtime
- **Severity:** Medium
- **Status:** OPEN
- **Area:** `src/services/documentService.ts` DocumentCategory type
- **Issue:** 70+ categories as union type but no runtime validation
- **Risk:** Typos in category names create invalid data
- **Proposed Fix:**
```typescript
const VALID_CATEGORIES: readonly DocumentCategory[] = [
  'drivers_license', 'passport', /* ... all 70+ categories ... */
] as const;

function isValidDocumentCategory(value: string): value is DocumentCategory {
  return (VALID_CATEGORIES as readonly string[]).includes(value);
}
```
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### QUAL-003: Magic Strings Not Constants
- **Severity:** Medium
- **Status:** OPEN
- **Area:** `src/services/documentService.ts:338-352`
- **Issue:** Category strings duplicated between types and SENSITIVE_CATEGORIES constant
- **Risk:** Typos cause mismatch between types and runtime checks
- **Proposed Fix:** Generate SENSITIVE_CATEGORIES from DocumentCategory union type or vice versa
- **Assigned:** Unassigned
- **Target:** Phase 2 (Week 2)

### QUAL-004: Inconsistent Naming Conventions
- **Severity:** Medium
- **Status:** OPEN
- **Area:** SQL vs TypeScript
- **Issue:** SQL uses snake_case, TypeScript uses camelCase, manual mapping required
- **Risk:** Bugs from incorrect mappings
- **Proposed Fix:**
  1. Use Supabase type generator: `supabase gen types typescript`
  2. Add mapping tests to verify correctness
- **Assigned:** Unassigned
- **Target:** Phase 1 (Week 1)

---

## Low Severity Issues (Deferred)

### PERF-003: File Buffer Loaded Into Memory
- **Severity:** Low
- **Status:** DEFERRED (optimization)
- **Area:** `documentService.ts` uploadDocument
- **Issue:** Entire file loaded as File/Blob before upload
- **Risk:** High memory usage for 100MB videos
- **Proposed Fix:** Use streaming upload for files >10MB
- **Target:** Phase 5 (Future)

### UX-003: Missing Upload Progress Callbacks
- **Severity:** Low
- **Status:** DEFERRED (enhancement)
- **Area:** `documentService.ts` uploadDocument
- **Issue:** No way to show upload progress for large files
- **Risk:** Poor UX for slow uploads (no progress bar)
- **Proposed Fix:** Add optional `onProgress?: (percent: number) => void` callback parameter
- **Target:** Phase 4 (Week 4)

---

## Issue Summary

| Severity | Open | Fixed | Deferred | Total |
|----------|------|-------|----------|-------|
| **Critical** | 2 | 0 | 0 | 2 |
| **High** | 3 | 2 | 0 | 5 |
| **Medium** | 7 | 2 | 0 | 9 |
| **Low** | 0 | 0 | 2 | 2 |
| **TOTAL** | **12** | **4** | **2** | **18** |

**Production Blockers:** 2 (SEC-001, QUAL-001)
**Beta Blockers:** 3 (SEC-004, REL-001, QUAL-002 partial)

---

## Next Actions

### Immediate (Before Commit)
1. ✅ Fix SEC-002 (tenant validation)
2. ✅ Fix SEC-003 (file path sanitization)
3. ✅ Fix REL-002 (file size validation)
4. ✅ Fix REL-003 (race condition)
5. ✅ Fix UX-001 (error codes) - partial
6. ⚠️ Fix QUAL-002 (idempotent migration) - document limitations

### Phase 1 (Week 1) - Production Readiness
1. **SEC-001**: Implement encryption service (AES-256-GCM)
2. **QUAL-001**: Write unit tests (80%+ coverage)
3. **SEC-004**: Add role validation to RLS policies
4. **QUAL-002**: Make all RLS policies idempotent
5. **QUAL-004**: Generate TypeScript types from Supabase schema

### Phase 2 (Week 2) - Polish & Optimization
1. **REL-001**: Implement atomic upload (Edge Function or cleanup cron)
2. **REL-004**: Implement decryption (depends on SEC-001)
3. **PERF-001**: Add compound indexes
4. **PERF-002**: Optimize expiring documents view
5. **UX-001**: Improve error messages (remaining)
6. **UX-002**: Add runtime category validation
7. **QUAL-003**: Eliminate magic strings

### Phase 3 (Week 3) - Compliance
1. **SEC-005**: Implement access audit trail
2. Build self-service portal for workers
3. Document verification workflow

### Phase 4-5 (Weeks 4+) - Enhancements
1. **UX-003**: Upload progress callbacks
2. **PERF-003**: Streaming uploads for large files
3. Automated expiry alerts
4. Document versioning
