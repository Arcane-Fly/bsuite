# Document Storage Implementation Guide

## Overview

This guide covers the complete implementation of the 14-bucket document storage system for comprehensive Australian GTO operations, including funding claims, employment documents, compliance, WHS, and governance.

## Implementation Status

- ✅ Architecture designed (14 buckets with categories)
- ✅ SQL migration created (`20260226_create_document_storage.sql`)
- ✅ TypeScript service created (`documentService.ts`)
- ⚠️ **PENDING**: Apply migration to Supabase
- ⚠️ **PENDING**: Implement encryption service
- ⚠️ **PENDING**: Build UI components
- ⚠️ **PENDING**: Create self-service portal

## Quick Start

### 1. Apply Database Migration

```bash
cd /home/braden/Desktop/Dev/bsuite/crm7

# Apply the migration to Supabase
supabase db push

# Or if using Supabase CLI with remote project
supabase db push --linked
```

This will create:
- 14 storage buckets with RLS policies
- `document_metadata` table
- `documents_expiring_soon` view
- `get_documents_eligible_for_destruction()` function

### 2. Verify Storage Buckets

```bash
# List all buckets
supabase storage ls

# Expected output:
# - funding-claim-documents
# - funding-source-documents
# - apprentice-documents
# - employee-documents
# - labour-hire-documents
# - timesheet-documents
# - contract-documents
# - gto-compliance-documents
# - field-officer-reports
# - whs-incidents-documents
# - marketing-communications
# - quality-assurance-documents
# - host-employer-agreements
# - legal-governance-documents
```

### 3. Test Document Upload

```typescript
import { DocumentService } from '@/services/documentService';

// Example: Upload apprentice driver's license
const result = await DocumentService.uploadDocument({
  bucket: 'apprentice-documents',
  file: driverLicenseFile,
  category: 'drivers_license',
  type: 'identity',
  entityType: 'apprentice',
  entityId: apprenticeId,
  expiryDate: '2028-12-31',
  retentionPeriodYears: 7,
});

if (result.success) {
  console.log('Document uploaded:', result.documentId);
} else {
  console.error('Upload failed:', result.error);
}
```

## Architecture Details

### Storage Buckets

| Bucket | Purpose | Max Size | Key Categories |
|--------|---------|----------|----------------|
| **funding-claim-documents** | Funding claim supporting evidence | 50MB | Eligibility, invoices, training records |
| **funding-source-documents** | Funding source agreements & reports | 50MB | Contracts, guidelines, performance reports |
| **apprentice-documents** | Apprentice personal & employment docs | 20MB | Identity, employment, qualifications, compliance |
| **employee-documents** | GTO employee documents | 20MB | Same as apprentice + performance reviews |
| **labour-hire-documents** | Labour hire worker documents | 20MB | Identity, licenses, workers comp |
| **timesheet-documents** | Timesheet submissions & approvals | 10MB | Weekly timesheets, variations, approvals |
| **contract-documents** | Employment & training contracts | 50MB | Apprenticeship agreements, variations |
| **gto-compliance-documents** | National Standards compliance evidence | 50MB | ASQA, audits, policies, insurance |
| **field-officer-reports** | Site visits & monitoring | 20MB | Visit reports, progress reviews, competency |
| **whs-incidents-documents** | WHS incident management | 50MB | Incidents, investigations, workers comp |
| **marketing-communications** | Marketing materials & campaigns | 100MB | Brochures, videos, consent forms |
| **quality-assurance-documents** | QA & continuous improvement | 50MB | Corrective actions, complaints, validation |
| **host-employer-agreements** | Host employer management | 50MB | Applications, agreements, site docs |
| **legal-governance-documents** | Corporate governance & legal | 50MB | Board minutes, legal advice, submissions |

### Security & Privacy

#### Australian Privacy Act Compliance

The system implements all 13 Australian Privacy Principles (APPs):

1. **APP 1 (Open & Transparent)**: Privacy policy documented in DOCUMENT_STORAGE_SETUP.md
2. **APP 3 (Collection)**: Only collect documents necessary for GTO operations
3. **APP 5 (Notification)**: Users notified of collection purpose
4. **APP 6 (Use & Disclosure)**: Documents only used for employment/training purposes
5. **APP 11 (Security)**: AES-256-GCM encryption for sensitive documents
6. **APP 12 (Access)**: Self-service portal for workers to access own documents
7. **APP 13 (Correction)**: Users can request document updates

#### Sensitive Documents

Documents requiring encryption (marked with `is_sensitive = true`):

- Tax File Number (TFN) declarations
- Bank account details
- Medical reports & certificates
- Police checks
- Visa/work permits
- Drug & alcohol test results
- Immunisation records
- Workers compensation claims

**Encryption**: AES-256-GCM (to be implemented in Phase 2)

#### Row Level Security (RLS)

All buckets have RLS policies enforcing:

1. **Tenant isolation**: Users can only access documents from their tenant
2. **Self-service access**: Workers can upload/view their own documents
3. **Role-based access**: HR, admin, managers have appropriate access levels
4. **Restricted access**: WHS incidents, legal docs limited to specific roles

### Document Lifecycle

#### 1. Upload

```typescript
DocumentService.uploadDocument({
  bucket: 'apprentice-documents',
  file: file,
  category: 'white_card',
  type: 'qualification',
  entityType: 'apprentice',
  entityId: 'uuid',
  expiryDate: '2026-12-31',
  retentionPeriodYears: 7,
});
```

#### 2. Verification

```typescript
DocumentService.verifyDocument(
  documentId,
  'certified_copy',
  'Sighted original, certified copy on file'
);
```

#### 3. Expiry Monitoring

```typescript
// Get documents expiring in next 30 days
const expiring = await DocumentService.getExpiringDocuments(30);

// Auto-send alerts (implement in cron job)
expiring.forEach(doc => {
  if (!doc.expiryAlertSentAt) {
    sendExpiryAlert(doc);
  }
});
```

#### 4. Retention & Destruction

```typescript
// Get documents past retention period
const eligible = await DocumentService.getDocumentsForDestruction();

// Review and destroy (must be manual process with approval)
eligible.forEach(doc => {
  console.log(`Eligible for destruction: ${doc.fileName}`);
  console.log(`Uploaded: ${doc.uploadedAt}`);
  console.log(`Retention: ${doc.retentionPeriodYears} years`);
});
```

### Retention Periods (Australian Law)

| Document Type | Minimum Retention | Legal Basis |
|---------------|------------------|-------------|
| Employment records | 7 years | Fair Work Act 2009 |
| Tax records (TFN) | 5 years | Taxation Administration Act 1953 |
| Superannuation | 5 years | Superannuation Guarantee Act 1992 |
| Training records | 7 years | VET Quality Framework |
| WHS incidents | 7 years | Work Health and Safety Act 2011 |
| Apprenticeship records | Permanent | Industry best practice |
| Financial records | 7 years | Corporations Act 2001 |

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Tasks:**
1. ✅ Apply database migration
2. ✅ Verify all 14 buckets created
3. ✅ Test RLS policies
4. ✅ Create TypeScript service
5. ⚠️ Implement encryption service (see below)

**Encryption Service Implementation:**

```typescript
// src/services/encryptionService.ts
import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits

  /**
   * Derive encryption key from tenant master key
   */
  private deriveKey(tenantMasterKey: string, salt: Buffer): Buffer {
    return pbkdf2Sync(tenantMasterKey, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt a file buffer
   */
  async encryptFile(
    fileBuffer: Buffer,
    tenantMasterKey: string
  ): Promise<{
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
    salt: Buffer;
  }> {
    const salt = randomBytes(16);
    const key = this.deriveKey(tenantMasterKey, salt);
    const iv = randomBytes(16);

    const cipher = createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag, salt };
  }

  /**
   * Decrypt a file buffer
   */
  async decryptFile(
    encryptedBuffer: Buffer,
    tenantMasterKey: string,
    iv: Buffer,
    authTag: Buffer,
    salt: Buffer
  ): Promise<Buffer> {
    const key = this.deriveKey(tenantMasterKey, salt);

    const decipher = createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final(),
    ]);
  }
}
```

### Phase 2: UI Components (Week 2)

**Components to Build:**

1. **DocumentUploadModal** - Multi-file upload with category selection
2. **DocumentList** - Table view with filters (category, type, status)
3. **DocumentViewer** - Preview PDFs/images inline
4. **DocumentVerificationCard** - Verify documents with status updates
5. **ExpiringDocumentsWidget** - Dashboard widget for expiring docs
6. **DocumentTimelineItem** - Upload/verification history

**Example Component:**

```typescript
// src/components/documents/DocumentUploadModal.tsx
import { useState } from 'react';
import { DocumentService, type DocumentCategory, type DocumentType } from '@/services/documentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface DocumentUploadModalProps {
  bucket: StorageBucket;
  entityType: EntityType;
  entityId: string;
  onSuccess: () => void;
}

export function DocumentUploadModal(props: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('drivers_license');
  const [type, setType] = useState<DocumentType>('identity');
  const [expiryDate, setExpiryDate] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    const result = await DocumentService.uploadDocument({
      bucket: props.bucket,
      file,
      category,
      type,
      entityType: props.entityType,
      entityId: props.entityId,
      expiryDate: expiryDate || undefined,
    });

    setUploading(false);

    if (result.success) {
      props.onSuccess();
    } else {
      alert(result.error);
    }
  };

  return (
    <div className="space-y-4">
      <Input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <Select value={category} onValueChange={setCategory}>
        <option value="drivers_license">Driver's License</option>
        <option value="white_card">White Card</option>
        {/* Add all categories */}
      </Select>
      <Input
        type="date"
        placeholder="Expiry Date (optional)"
        value={expiryDate}
        onChange={(e) => setExpiryDate(e.target.value)}
      />
      <Button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? 'Uploading...' : 'Upload'}
      </Button>
    </div>
  );
}
```

### Phase 3: Self-Service Portal (Week 3)

**Features:**

1. **Worker Dashboard**
   - View all uploaded documents
   - Upload new documents
   - See document status (pending verification, verified, expired)
   - Receive expiry alerts

2. **Document Requirements Checklist**
   - Show required documents for onboarding
   - Track completion status
   - Send reminders for missing docs

3. **Mobile-Responsive Upload**
   - Take photo with phone camera
   - Upload directly from mobile
   - Progress indicators

### Phase 4: Admin & Compliance Tools (Week 4)

**Features:**

1. **Document Verification Queue**
   - List all pending documents
   - Inline preview
   - Approve/reject workflow
   - Bulk verification

2. **Expiry Management Dashboard**
   - Calendar view of expiring documents
   - Automated email reminders
   - Bulk alert sending

3. **Compliance Reports**
   - Document completion rates
   - Verification status overview
   - Retention compliance report
   - Destruction eligible documents

4. **Audit Trail**
   - Complete document history
   - Who uploaded/verified/deleted
   - Timestamp tracking
   - Export for compliance audits

## Testing Checklist

### Unit Tests

- [ ] Document upload validation (file size, MIME type)
- [ ] Document category validation
- [ ] Encryption/decryption round-trip
- [ ] Metadata creation
- [ ] RLS policy enforcement

### Integration Tests

- [ ] Upload document to each bucket
- [ ] Download and verify file integrity
- [ ] Delete document and verify cleanup
- [ ] Test self-service access (apprentice can only see own docs)
- [ ] Test role-based access (HR can see all apprentice docs)
- [ ] Test restricted access (only WHS officer can see incidents)

### End-to-End Tests

- [ ] Apprentice onboarding flow (upload 5+ required documents)
- [ ] Document verification workflow
- [ ] Expiry alert generation
- [ ] Document destruction review process

## Monitoring & Maintenance

### Daily Tasks

- Check expiring documents dashboard
- Send expiry alerts for documents expiring in <7 days
- Review document verification queue

### Weekly Tasks

- Review uploaded documents for verification
- Check storage bucket usage
- Monitor failed uploads

### Monthly Tasks

- Run retention compliance report
- Review documents eligible for destruction
- Audit sensitive document access logs
- Update document categories if needed

### Annual Tasks

- Review retention periods against Australian law updates
- Update encryption keys
- Compliance audit (APPs 1-13)
- Review and update privacy policy

## Support & Troubleshooting

### Common Issues

**Issue: "File size exceeds maximum"**
- Solution: Check `BUCKET_SIZE_LIMITS` in documentService.ts
- Apprentice/employee docs: 20MB max
- Videos (marketing): 100MB max

**Issue: "File type not allowed"**
- Solution: Check `ALLOWED_MIME_TYPES` for the bucket
- Add new types if needed (update migration + service)

**Issue: "Upload succeeds but metadata creation fails"**
- Solution: Storage file is auto-deleted, check tenant_id
- Ensure user has valid tenant_id in JWT/metadata

**Issue: "Cannot access document (403 Forbidden)"**
- Solution: Check RLS policies
- Verify user role matches policy requirements
- Test with supabase.auth.getUser() to check JWT claims

### Logs & Debugging

```typescript
// Enable debug logging
localStorage.setItem('DEBUG_DOCUMENTS', 'true');

// Check current user and tenant
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);
console.log('Tenant ID:', user?.user_metadata?.tenant_id);

// Test bucket access
const { data, error } = await supabase.storage
  .from('apprentice-documents')
  .list('', { limit: 1 });
console.log('Bucket access:', data, error);
```

## Next Steps

1. **Apply Migration** (10 min)
   ```bash
   supabase db push
   ```

2. **Test Upload** (30 min)
   - Create test apprentice
   - Upload driver's license
   - Verify metadata created

3. **Implement Encryption** (4 hours)
   - Create EncryptionService
   - Integrate with DocumentService
   - Test encrypt/decrypt

4. **Build UI Components** (2 days)
   - DocumentUploadModal
   - DocumentList
   - DocumentViewer

5. **Create Self-Service Portal** (3 days)
   - Worker dashboard
   - Document requirements
   - Mobile upload

6. **Admin Tools** (2 days)
   - Verification queue
   - Expiry management
   - Compliance reports

## References

- Australian Privacy Act 1988: https://www.oaic.gov.au/privacy/australian-privacy-principles
- Fair Work Act 2009: https://www.fairwork.gov.au/
- VET Quality Framework: https://www.asqa.gov.au/
- National Standards for GTOs: [DOCUMENT_STORAGE_SETUP.md](./DOCUMENT_STORAGE_SETUP.md)
- Supabase Storage Docs: https://supabase.com/docs/guides/storage
- Supabase RLS Docs: https://supabase.com/docs/guides/auth/row-level-security
