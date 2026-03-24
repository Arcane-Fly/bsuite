# Document Storage Setup for CRM7

## Required Supabase Storage Buckets

Create these buckets in Supabase Dashboard → Storage:

### 1. `funding-documents`

- **Purpose**: Funding claim supporting documents
- **Access**: Private (RLS enabled)
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Word, Images, Excel
- **Categories Supported**:
  - Training Contract
  - Apprenticeship Agreement
  - Host Employment Contract
  - Training Plan
  - Proof of Enrollment
  - Eligibility Evidence
  - Identity Documents
  - Qualification Certificate
  - USI Verification
  - Training Record Book
  - Assessment Results
  - Competency Records
  - Attendance Records
  - Insurance Documents
  - Safety Documentation
  - Supervisor Qualification
  - Invoice
  - Payment Receipt
  - Funding Application
  - Correspondence
  - Other

### 2. `contracts`

- **Purpose**: Employment and training contracts
- **Access**: Private (RLS enabled)
- **Max Size**: 25MB per file
- **Allowed Types**: PDF, Word
- **Sub-folders**:
  - `/apprentice-contracts` - Apprenticeship agreements
  - `/host-employer-contracts` - Host employer agreements
  - `/training-contracts` - Training provider contracts
  - `/gto-contracts` - GTO service agreements

### 3. `apprentice-documents`

- **Purpose**: Apprentice/Trainee personal and employment documents
- **Access**: Private (RLS enabled + self-access)
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Images
- **Categories**:
  - **Identity & Work Rights**:
    - Driver's License
    - Passport
    - Birth Certificate
    - Visa / Work Permit
    - Citizenship Certificate
  - **Employment Documents**:
    - Tax File Number Declaration (SENSITIVE - encrypted at rest)
    - Superannuation Choice Form
    - Bank Account Details (SENSITIVE - encrypted at rest)
    - Emergency Contact Form
    - Employment Contract
  - **Qualifications & Licenses**:
    - Trade Qualifications
    - Trade License
    - White Card (Construction Induction)
    - Forklift License
    - First Aid Certificate
    - Other Trade-Specific Licenses
  - **Compliance & Safety**:
    - Police Check
    - Working with Children Check
    - Pre-Employment Medical
    - Drug & Alcohol Test Results
    - Fit for Work Certificate
  - **Training & Induction**:
    - Site Induction Certificate
    - Safety Training Completion
    - Toolbox Talk Attendance
    - WHS Training Records
  - **Insurance**:
    - Personal Injury Insurance
    - Tool Insurance
    - Professional Indemnity (if applicable)

### 4. `employee-documents`

- **Purpose**: GTO direct employee personal and employment documents
- **Access**: Private (RLS enabled + self-access)
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Images
- **Categories**: Same as apprentice-documents plus:
  - **Additional Employment**:
    - Signed Employment Contract
    - Position Description
    - Performance Reviews
    - Leave Applications
    - Resignation Letter
    - Termination Documents
  - **Professional Development**:
    - Training Certificates
    - Conference Attendance
    - CPD Records
    - Qualification Upgrades

### 5. `labour-hire-documents`

- **Purpose**: Labour hire worker documents (workers employed by labour hire companies)
- **Access**: Private (RLS enabled + limited host employer access)
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Images
- **Categories**:
  - **Identity & Verification**:
    - Photo ID
    - Work Rights Documents
    - Proof of Address
  - **Employment & Compliance**:
    - Labour Hire License Verification
    - Employment Agreement (with labour hire company)
    - Work Permit
    - Police Check
    - Working with Children Check
  - **Skills & Qualifications**:
    - Trade Certificates
    - Licenses (relevant to work)
    - White Card
    - Site-Specific Inductions
  - **Insurance & Safety**:
    - Workers Compensation Certificate
    - Public Liability Insurance
    - WHS Induction Completion
    - Safety Training Records

### 6. `host-employer-documents`

- **Purpose**: Host employer business documents
- **Access**: Private (RLS enabled)
- **Max Size**: 10MB per file
- **Allowed Types**: PDF, Word, Images
- **Categories**:
  - Insurance certificates
  - WHS policies
  - Business registration
  - Site risk assessments
  - Supervisor qualifications

### 7. `training-materials`

- **Purpose**: Training plans, assessments, competency records
- **Access**: Private (RLS enabled)
- **Max Size**: 50MB per file
- **Allowed Types**: PDF, Word, Excel, PowerPoint, Images
- **Categories**:
  - Training plans
  - Assessment tools
  - Competency checklists
  - Progress reviews
  - Training record books

### 8. `gto-compliance-documents`

- **Purpose**: National Standards for GTOs compliance evidence
- **Access**: Private (Admin/Auditor only)
- **Max Size**: 50MB per file
- **Allowed Types**: PDF, Word, Excel
- **Categories**:
  - **Registration & RTO**:
    - ASQA Registration Certificate
    - State Training Authority Registration
    - Scope of Registration
    - Annual Compliance Reports
    - ASQA Audit Reports
    - Internal Audit Reports
  - **National Standards Evidence**:
    - Standard 1: Apprentice/Trainee Recruitment Evidence
    - Standard 2: Employment Arrangements Evidence
    - Standard 3: Training Arrangements Evidence
    - Standard 4: Monitoring & Support Evidence
    - Standard 5: Completion & Progression Evidence
    - Standard 6: Financial Management Evidence
  - **Policies & Procedures**:
    - Quality Assurance Framework
    - Risk Management Framework
    - Complaints & Appeals Policy
    - Continuous Improvement Plans
    - Marketing & Recruitment Policy
    - Host Employer Vetting Procedures
  - **Insurance & Indemnity**:
    - Public Liability Insurance
    - Professional Indemnity Insurance
    - Workers Compensation Certificate
    - Employers Liability Insurance
    - Group Training Organisation Insurance

### 9. `field-officer-reports`

- **Purpose**: Field officer visit reports and monitoring activities
- **Access**: Private (Field Officers, Managers, Admin)
- **Max Size**: 25MB per file
- **Allowed Types**: PDF, Word, Images
- **Categories**:
  - **Site Visits**:
    - Workplace Visit Report
    - Site Assessment Form
    - Placement Monitoring Report
    - Photo Evidence (with consent)
    - Host Employer Feedback
  - **Apprentice Support**:
    - Progress Review Notes (3-way meetings)
    - Mentoring Session Notes
    - Intervention Plans
    - Support Service Referrals
    - Exit Interview Notes
  - **Competency Monitoring**:
    - Competency Sign-Off Forms
    - On-the-Job Training Records
    - Supervisor Assessment Notes
    - Skills Development Plans
  - **Compliance Checks**:
    - Workplace Safety Checklist
    - Supervision Verification
    - Training Plan Progress Check
    - Equipment & Tools Verification

### 10. `whs-incidents-documents`

- **Purpose**: Work Health & Safety incident management
- **Access**: Private (WHS Officer, HR, Admin) - Legally Protected
- **Max Size**: 50MB per file
- **Allowed Types**: PDF, Word, Images, Excel
- **Categories**:
  - **Incident Reports**:
    - Initial Incident Report
    - Witness Statements
    - Incident Investigation Report
    - Photo Evidence
    - CCTV Footage (if applicable)
  - **Risk Management**:
    - Workplace Risk Assessments
    - Site Safety Audits
    - Hazard Reports
    - Near-Miss Reports
    - Safety Improvement Plans
  - **Injury Management**:
    - Workers Compensation Claims
    - Medical Reports
    - Return to Work Plans
    - Injury Management Correspondence
    - Rehabilitation Progress Notes
  - **Safety Compliance**:
    - Safety Induction Records
    - Toolbox Talk Attendance
    - Safety Meeting Minutes
    - Emergency Drill Records
    - PPE Issue Records
    - Plant & Equipment Safety Inspections

### 11. `marketing-communications`

- **Purpose**: Marketing materials, campaigns, and stakeholder communications
- **Access**: Private (Marketing, Admin) - Public materials archived here
- **Max Size**: 100MB per file (for videos/graphics)
- **Allowed Types**: PDF, Word, Images, PPT, MP4
- **Categories**:
  - **Marketing Materials**:
    - Brochures & Flyers
    - Promotional Videos
    - Social Media Content
    - Website Content Backups
    - Email Campaign Materials
    - Event Materials
  - **Recruitment Campaigns**:
    - Job Advertisements
    - Apprenticeship Promotions
    - Host Employer Recruitment Materials
    - Testimonials (with signed consent)
    - Case Studies (with signed consent)
  - **Media & Public Relations**:
    - Media Releases
    - Press Coverage
    - Partnership Announcements
    - Award Applications
    - Conference Presentations
  - **Stakeholder Communications**:
    - Newsletter Archives
    - Annual Reports (public versions)
    - Board Reports
    - Funding Body Communications
    - Industry Network Communications
  - **Consent Forms**:
    - Photography/Video Consent
    - Testimonial Use Consent
    - Marketing Use of Likeness

### 12. `quality-assurance-documents`

- **Purpose**: Quality management system documentation
- **Access**: Private (Quality Manager, Auditors, Admin)
- **Max Size**: 25MB per file
- **Allowed Types**: PDF, Word, Excel
- **Categories**:
  - **Continuous Improvement**:
    - Quality Improvement Plans
    - Corrective Action Requests
    - Preventive Action Plans
    - Non-Conformance Reports
    - Root Cause Analysis
  - **Feedback & Complaints**:
    - Stakeholder Feedback Forms
    - Complaints Register Evidence
    - Appeals Documentation
    - Resolution Evidence
    - Client Satisfaction Surveys
  - **Performance Monitoring**:
    - KPI Reports
    - Service Quality Metrics
    - Training Completion Rates
    - Host Employer Satisfaction
    - Apprentice Satisfaction Surveys
  - **Validation & Moderation**:
    - Assessment Validation Reports
    - Moderation Meeting Minutes
    - Assessor Calibration Records
    - Third-Party Validation Evidence

### 13. `host-employer-agreements`

- **Purpose**: Host employer contracts and related documents
- **Access**: Private (Business Development, Legal, Admin)
- **Max Size**: 25MB per file
- **Allowed Types**: PDF, Word
- **Categories**:
  - **Applications & Vetting**:
    - Host Employer Application Form
    - Business Verification Documents
    - ABN/ACN Verification
    - Insurance Certificates
    - Financial Checks
    - Reference Checks
  - **Agreements & Contracts**:
    - Signed Host Employer Agreement
    - Variations to Agreement
    - Renewal Documentation
    - Termination Notices
  - **Site Documentation**:
    - Site Risk Assessment
    - Workplace Induction Materials
    - Supervisor Qualifications
    - Equipment & Facilities Checklist
  - **Performance Management**:
    - Host Employer Reviews
    - Placement Feedback
    - Performance Improvement Plans
    - Dispute Resolution Documents

### 14. `legal-governance-documents`

- **Purpose**: Legal contracts, governance, and board documents
- **Access**: Private (CEO, Legal, Board Members only)
- **Max Size**: 50MB per file
- **Allowed Types**: PDF, Word
- **Categories**:
  - **Corporate Governance**:
    - Constitution/Articles of Association
    - Board Meeting Minutes
    - Board Resolutions
    - Director Declarations
    - Conflict of Interest Registers
  - **Legal Agreements**:
    - Service Agreements
    - Partnership Agreements
    - Funding Agreements
    - Lease Agreements
    - Software Licenses
  - **Regulatory Submissions**:
    - ASQA Submissions
    - State Training Authority Reports
    - Annual Regulatory Returns
    - ATO Correspondence
    - Fair Work Compliance Documentation
  - **Legal Matters**:
    - Legal Advice (privileged)
    - Litigation Documents
    - Insurance Claims
    - Indemnity Agreements

## Privacy & Compliance Considerations

### Australian Privacy Principles (APP) Compliance

**Sensitive Information Handling:**

- Tax File Numbers (TFN) - Covered under Privacy Act 1988, requires encryption at rest
- Bank account details - Financial information requiring secure handling
- Medical information - Health records under APP 3 & 8
- Police checks - Criminal record information requiring consent and secure storage
- Visa/citizenship status - Immigration information requiring protection

**Encryption Requirements:**

```typescript
// Sensitive document types requiring additional encryption
const SENSITIVE_DOCUMENT_TYPES = [
  'tax_file_number_declaration',
  'bank_account_details',
  'medical_certificates',
  'police_check',
  'visa_work_permit',
];

// These documents should be encrypted at application level before storage
// Use AES-256 encryption with tenant-specific keys
```

### Document Retention Policy

**Minimum Retention Periods (Australian Law):**

- Employment records: 7 years after termination
- Tax records (TFN declarations): 5 years after employee leaves
- Superannuation records: 5 years
- Training records: 7 years (VET requirements)
- WHS incidents: 7 years
- Apprenticeship records: Permanent (recommended for audit purposes)

**Auto-Deletion Policy:**

- Documents marked for deletion after retention period expires
- Soft delete (archive) before permanent deletion
- Audit trail of all deletions

### Self-Service Access Controls

**Worker/Apprentice Portal Access:**

```typescript
// Workers can upload their own documents
const SELF_SERVICE_CATEGORIES = [
  'identity_verification',
  'qualifications',
  'licenses',
  'medical_certificates',
  'police_checks',
  'bank_account_details', // view own only
];

// Workers can view but NOT edit:
const VIEW_ONLY_CATEGORIES = [
  'employment_contract',
  'position_description',
  'performance_reviews',
];
```

**Access Levels:**

1. **Worker/Apprentice**: Upload own documents, view own documents
2. **Supervisor**: View assigned workers' non-sensitive documents
3. **HR/Admin**: Full access to all documents
4. **Payroll**: Access to TFN, bank details, super forms only
5. **Host Employer**: Limited access to worker qualifications and compliance docs

### Document Verification Workflow

**Required Verifications:**

```typescript
interface DocumentVerification {
  id: string;
  document_id: string;
  verified_by: string;
  verified_at: string;
  verification_type: 'sighted' | 'certified_copy' | 'original' | 'digital_verified';
  expiry_date?: string; // For licenses, permits, etc.
  notes?: string;
}
```

**Auto-Expiry Alerts:**

- White Cards: 5 years (doesn't expire but recommended refresh)
- Trade Licenses: Varies by state
- Police Checks: 3 years (recommended refresh)
- Working with Children: 5 years
- Medical certificates: As specified on certificate
- Visas: As specified on visa

## Storage RLS Policies

Apply these Row Level Security policies to each bucket:

### 1. Funding Documents (Admin/Manager Only)

```sql
-- Read: Tenant users can read funding claim documents
CREATE POLICY "Read funding documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'funding-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM funding_claims WHERE tenant_id = auth.jwt() ->> 'tenant_id'
  )
);

-- Insert: Admin/Manager can upload funding documents
CREATE POLICY "Upload funding documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'funding-documents' AND
  auth.jwt() ->> 'role' IN ('admin', 'manager')
);

-- Delete: Admin only
CREATE POLICY "Delete funding documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'funding-documents' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

### 2. Apprentice/Trainee Documents (Self-Service + Admin)

```sql
-- Read: Apprentices can read ONLY their own documents
CREATE POLICY "Read own apprentice documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'apprentice-documents' AND (
    -- Admin/Manager can read all
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'hr') OR
    -- Apprentice can read own documents (folder name = user_id)
    (storage.foldername(name))[1] = auth.uid()::text OR
    -- Supervisor can read assigned apprentices
    (storage.foldername(name))[1] IN (
      SELECT apprentice_id::text FROM placements
      WHERE supervisor_id = auth.uid()
      AND status = 'active'
    )
  )
);

-- Insert: Apprentices can upload to their own folder only
CREATE POLICY "Upload own apprentice documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'apprentice-documents' AND (
    auth.jwt() ->> 'role' IN ('admin', 'manager', 'hr') OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Delete: Admin only (workers cannot delete, only upload new versions)
CREATE POLICY "Delete apprentice documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'apprentice-documents' AND
  auth.jwt() ->> 'role' IN ('admin', 'hr')
);
```

### 3. Employee Documents (Self-Service + HR)

```sql
-- Read: Employees can read ONLY their own documents, HR can read all
CREATE POLICY "Read employee documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employee-documents' AND (
    auth.jwt() ->> 'role' IN ('admin', 'hr', 'payroll') OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Insert: Employees can upload to their own folder, HR can upload to any
CREATE POLICY "Upload employee documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employee-documents' AND (
    auth.jwt() ->> 'role' IN ('admin', 'hr') OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Delete: HR only
CREATE POLICY "Delete employee documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employee-documents' AND
  auth.jwt() ->> 'role' IN ('admin', 'hr')
);
```

### 4. Labour Hire Documents (Limited Access)

```sql
-- Read: Host employers can read workers assigned to them
CREATE POLICY "Read labour hire documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'labour-hire-documents' AND (
    auth.jwt() ->> 'role' IN ('admin', 'hr') OR
    -- Host employer can read workers placed at their sites
    (storage.foldername(name))[1] IN (
      SELECT worker_id::text FROM placements
      WHERE host_employer_id IN (
        SELECT id FROM host_employers WHERE contact_user_id = auth.uid()
      )
      AND status = 'active'
    )
  )
);

-- Insert: Admin/HR only
CREATE POLICY "Upload labour hire documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'labour-hire-documents' AND
  auth.jwt() ->> 'role' IN ('admin', 'hr')
);

-- Delete: Admin only
CREATE POLICY "Delete labour hire documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'labour-hire-documents' AND
  auth.jwt() ->> 'role' = 'admin'
);
```

### 5. Sensitive Document Encryption (Application Level)

**IMPORTANT**: TFN, bank details, and medical records should be encrypted at the application level BEFORE uploading to storage.

```typescript
// Example encryption service
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

class SensitiveDocumentService {
  private algorithm = 'aes-256-gcm';

  async encryptDocument(buffer: Buffer, tenantKey: string): Promise<{
    encrypted: Buffer;
    iv: Buffer;
    authTag: Buffer;
  }> {
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.algorithm, Buffer.from(tenantKey, 'hex'), iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  async decryptDocument(
    encrypted: Buffer,
    iv: Buffer,
    authTag: Buffer,
    tenantKey: string
  ): Promise<Buffer> {
    const decipher = createDecipheriv(this.algorithm, Buffer.from(tenantKey, 'hex'), iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }
}
```

## Document Type Configuration

### Allowed MIME Types

```typescript
const ALLOWED_FILE_TYPES = [
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];
```

### File Size Limits by Category

- Standard documents: 10MB
- Contracts: 25MB
- Training materials: 50MB
- Images: 5MB

## Database Schema

Documents are stored as JSONB in the database:

```typescript
interface DocumentMetadata {
  id: string;
  title: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by: string;
  category: string;
  bucket?: string;
  path?: string;
}

// Stored in funding_claims.supporting_documents as JSONB array
supporting_documents: DocumentMetadata[]
```

## Implementation Status

- ✅ DocumentUpload component created with 20+ categories
- ✅ FundingService.uploadDocument method
- ✅ File validation (type, size)
- ✅ Category selection
- ⚠️ **TODO**: Create storage buckets in Supabase
- ⚠️ **TODO**: Configure RLS policies
- ⚠️ **TODO**: Test document upload/download flow
- ⚠️ **TODO**: Add virus scanning (optional, via Supabase Edge Function)

## Implementation Roadmap

### Phase 1: Storage Infrastructure (Week 1)

1. **Create 8 storage buckets** in Supabase Dashboard:
   - ✅ `funding-documents`
   - ⚠️ `contracts`
   - ⚠️ `apprentice-documents`
   - ⚠️ `employee-documents`
   - ⚠️ `labour-hire-documents`
   - ⚠️ `host-employer-documents`
   - ⚠️ `training-materials`
   - ⚠️ `compliance-documents`

2. **Apply RLS policies** for each bucket (see policies above)

3. **Set up encryption service** for sensitive documents

4. **Configure bucket settings**:
   - File size limits
   - Allowed MIME types
   - Public vs private access

### Phase 2: Admin Document Management (Week 2)

1. **Enhance DocumentUpload component** with:
   - Employment-specific categories
   - Document expiry date field
   - Verification status
   - Sensitive document warning

2. **Create document management pages**:
   - `/apprentices/[id]/documents` - Apprentice document hub
   - `/employees/[id]/documents` - Employee document hub
   - `/labour-hire/[id]/documents` - Labour hire worker documents

3. **Implement document verification workflow**:
   - Mark as "sighted", "certified copy", or "original"
   - Add expiry dates
   - Set up renewal reminders

### Phase 3: Self-Service Portal (Week 3-4)

1. **Create worker/apprentice portal routes**:
   - `/portal/my-documents` - Personal document upload
   - `/portal/profile` - View and update details
   - `/portal/notifications` - Expiry alerts

2. **Implement self-service document upload**:
   - Category selection (limited to allowed categories)
   - File validation
   - Upload progress indicator
   - Success confirmation

3. **Add document status tracking**:
   - "Pending verification"
   - "Verified"
   - "Expired - renewal required"
   - "Rejected - reupload required"

4. **Email notifications**:
   - Document uploaded successfully
   - Document verified by admin
   - Document expiring soon (30 days, 7 days)
   - Document expired

### Phase 4: Compliance & Reporting (Week 5)

1. **Document compliance dashboard**:
   - Workers missing required documents
   - Documents expiring soon
   - Verification status overview
   - Compliance by category

2. **Automated compliance checks**:
   - Pre-placement validation (all docs current?)
   - Periodic checks for expiring documents
   - Alert supervisors/HR of non-compliance

3. **Audit trail**:
   - Who uploaded each document
   - Who verified each document
   - Document version history
   - Access logs for sensitive documents

4. **Reporting**:
   - Compliance reports by worker type
   - Document verification status
   - Export for audits

### Phase 5: Advanced Features (Future)

1. **Document expiry automation**:
   - Auto-notify workers 30 days before expiry
   - Escalate to supervisors at 7 days
   - Mark as expired and trigger compliance alerts

2. **Document versioning**:
   - Keep history of replaced documents
   - Compare versions
   - Restore previous versions

3. **Bulk document upload**:
   - Upload multiple documents at once
   - CSV import for metadata
   - Batch processing

4. **Advanced search & filters**:
   - Search by document type, worker name, expiry date
   - Filter by verification status
   - Export search results

5. **Integration with government systems**:
   - Auto-verify police checks via ACIC
   - Auto-verify working with children checks
   - Auto-verify qualifications via training.gov.au

## Current Implementation Status

- ✅ DocumentUpload component created with 20+ funding categories
- ✅ FundingService.uploadDocument method
- ✅ File validation (type, size)
- ✅ Category selection
- ✅ Document storage architecture designed
- ⚠️ **TODO**: Create 8 storage buckets in Supabase
- ⚠️ **TODO**: Apply RLS policies for all buckets
- ⚠️ **TODO**: Implement encryption service for sensitive docs
- ⚠️ **TODO**: Add employment document categories to UI
- ⚠️ **TODO**: Build self-service portal
- ⚠️ **TODO**: Implement document verification workflow
- ⚠️ **TODO**: Set up expiry alerts and automation

## Testing Checklist

### Storage Infrastructure

- [ ] All 8 buckets created
- [ ] RLS policies applied and tested
- [ ] File size limits enforced
- [ ] MIME type validation working
- [ ] Bucket access controls verified

### Document Upload

- [ ] Admin can upload to any bucket
- [ ] Workers can upload to own folder only
- [ ] File validation prevents invalid uploads
- [ ] Progress indicator shows during upload
- [ ] Success/error messages display correctly

### Self-Service Portal

- [ ] Workers can access their own documents only
- [ ] Upload works from worker portal
- [ ] Document list displays correctly
- [ ] Download works for workers' own docs
- [ ] Cannot delete documents (admin only)

### Sensitive Documents

- [ ] TFN declarations encrypted before upload
- [ ] Bank details encrypted before upload
- [ ] Medical records encrypted before upload
- [ ] Decryption works correctly on download
- [ ] Access logs capture sensitive doc access

### Compliance

- [ ] Expiry dates set correctly
- [ ] Renewal alerts trigger on time
- [ ] Compliance dashboard shows accurate data
- [ ] Missing documents flagged correctly
- [ ] Audit trail captures all actions

### Privacy & Security

- [ ] RLS prevents cross-tenant access
- [ ] Workers cannot see other workers' docs
- [ ] Supervisors see only assigned workers
- [ ] Sensitive docs require additional auth
- [ ] Audit logs cannot be deleted
