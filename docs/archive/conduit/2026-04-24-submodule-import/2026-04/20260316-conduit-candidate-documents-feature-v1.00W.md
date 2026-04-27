# Conduit: Candidate Documents Feature

**Date:** 2026-03-16
**Status:** W (Working)
**Version:** 1.00
**Project:** conduit

## Overview

The Candidate Documents tab provides document management for individual candidates within the Conduit ATS. Documents are associated with candidates and can be uploaded, viewed, and managed from the candidate profile.

## Implementation

### Route
```
/candidates/[id]/documents/
```
This tab is accessible from the candidate detail view, alongside other tabs (Profile, Applications, Notes, etc.).

### Data Storage
- **Table:** `r7_documents`
- **Filter:** `entity_type = 'candidate'` and `entity_id = <candidate_id>`
- Documents are linked to candidates via the `r7_documents` table's entity reference pattern

### Status
- **Implemented:** 2026-03-16 (P0/P1 sweep)
- Tab navigation wired to candidate profile

## Usage

Navigate to a candidate profile and select the **Documents** tab to:
- Upload documents for a candidate
- View previously uploaded documents
- Manage document metadata

## Related

- `r7_documents` table (Supabase)
- Candidate profile pages in `src/app/candidates/[id]/`
- `conduit/docs/README.md`
