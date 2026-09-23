---
kind: record
authority: none
owner: bsuite
---

# [P1][Jodie] File attachment reports success but forwards only filenames; complete training-plan import through the real authoring workflow

https://github.com/GaryOcean428/crm7/issues/2586

Snapshot updatedAt: 2026-09-08T05:23:42Z. Open at capture; re-read live.

## Trigger and current evidence
Braden's 8 September notes report Training Plan Upload failing through Jodie. Source tracing identifies a concrete related defect in the mounted assistant input:
- `src/components/ai/AIInputArea.tsx:85–99` takes selected File objects, appends `[Attachment: filename]` text, displays “Files attached”, and clears the input. It does not read or upload the bytes in that handler.
- `src/components/ai/AIAssistant.tsx:257` mounts AIInputArea; `src/layouts/MainLayout.tsx:27,213` imports and mounts AIAssistant in the authenticated shell.
- `src/pages/training/plans/[id]/index.tsx` reads plan/unit records; creation is `src/pages/training/plans/create.tsx`. The upload-to-structured-plan route must be traced through the actual product. The filename-only defect is source-confirmed; its identity with every user-observed training upload failure is not yet live-reproduced.

## Required behavior
Attach a document from the training-plan or Jodie context and actually upload authorized content with progress, validation and retry. Link the file to the current person/training contract/plan. Parse/extract into a visible proposed form, show source provenance and unresolved fields/units, let the user correct/approve, then save using the canonical form/workflow path. Jodie cannot silently invent missing units or replace the operator's data. The same import is available visually without requiring a chat prompt.

## Acceptance
- [ ] File bytes reach approved tenant-scoped storage/processing; the UI says attached only after the required stage succeeds. Validate type/size, authentication, permissions and cancellation.
- [ ] Training-plan upload offers preview/mapping to canonical qualification/units and contract; unknown identifiers need human resolution, and no invented completion progress or fabricated data is written.
- [ ] Save and reload the document, extracted draft and accepted plan; original file and provenance remain accessible to permitted users.
- [ ] Configure the upload/parse/review/save/follow-up chain visually as workflow steps; completing a chat tool is not an alternative ungoverned write path.
- [ ] Source-file instructions are treated as data, not authority to call tools, change tenant, disclose information or override the operator.
- [ ] Failed upload, extraction, approval or save retains the file/draft and names the failed stage. Retry does not duplicate plan/unit/document rows; replacing a file does not overwrite a signed/published record silently.
- [ ] Test by uploading a fixture whose filename contains no useful content; verify an internal unique phrase is extracted. A filename-only implementation must fail. Exercise corrupt/encrypted/oversized/unsupported files and cross-tenant retrieval denial.
- [ ] Reproduce the operator's exact route on deployed d.crm.crm7.app as the intended role; capture network/storage/record proof and a full save/reload trace. No emails or external notices sent without test authorization.

Owner role: Jodie/document authoring maintainer. Parent https://github.com/GaryOcean428/bsuite/issues/3204, workflow dependency https://github.com/GaryOcean428/bsuite/issues/3209; related #1685 (contract-owned plan units), #2573 (person/apprentice identity), #2462 (schema contract). Enumerate all attachment handlers and AI input consumers, including sibling apps; report which use actual uploads versus filename summaries.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
