# [P1][workflow] Draft creation writes ai_context=NULL against live NOT NULL schema and can leave a definition without a draft

https://github.com/GaryOcean428/bsuite/issues/3205

Snapshot updatedAt: 2026-09-08T05:23:31Z. Open at capture; re-read live.

## Trigger and observed failure
Braden's 8 September notes report: `null value in column "ai_context" of relation "workflow_definition_versions" violates not-null constraint`; workflow creation fails.

## Verified evidence (8 September)
- `crm7/src/pages/workflows/index.tsx:167` calls `createWorkflowWithDraft` without aiContext.
- `crm7/src/lib/workflows/workflowDefinitionService.ts:331` inserts `ai_context: params.aiContext ?? null`; lines 374–413 create a definition first and only then its draft. If the second insert fails, this function has no transaction or cleanup in that path. Do not treat its comment saying both are created together as evidence of atomicity.
- Shared `packages/workflow-canvas/src/service.ts:317` also inserts null; `updateVersionAiContext` at line 389 accepts null, and duplicate-definition code forwards nullable source context.
- **Live catalog**, Supabase `tuybltdrdefjblnplpqo`: `information_schema.columns` for public.workflow_definition_versions.ai_context returned `is_nullable=NO`, `column_default='{}'::jsonb`. The default does not replace an explicitly supplied NULL.
- This is a source + live-contract finding corroborating the user report; this audit did not mutate production to reproduce it.

## Required change
Choose and enforce one canonical non-null context contract throughout create, copy, edit and publish. Prefer an empty object for no AI rationale unless the domain schema is deliberately changed with consumer review. Do not weaken the database constraint just to hide a mismatched payload. Create definition + initial version atomically, or implement an equally explicit recovery contract that cannot strand invisible definitions or duplicate them on retry. Inspect existing orphan candidates read-only and provide a safe repair path; do not delete real authored work automatically.

## Scope and dependencies
Owner role: shared workflow persistence maintainer. Two verified implementation copies (CRM7 local service and shared package); enumerate imports, package consumers and all callers before editing. Coordinate with GaryOcean428/crm7#2302 so the repair is not left in only the copy one app happens to use. Parent programme: https://github.com/GaryOcean428/bsuite/issues/3204.

## Acceptance
- [ ] Blank create, template duplicate, new version, human-only authoring and Jodie-assisted authoring all persist and reload valid context.
- [ ] Real-schema integration tests cover omitted context, null input, empty object and meaningful rationale; mocks must enforce nullability and actual transactional behavior.
- [ ] Force version insert failure after definition creation: no orphan/duplicate or false success; retry returns one usable workflow and preserves the author's input.
- [ ] Concurrent version creation and concurrent duplicate requests remain bounded and return useful conflicts.
- [ ] Tenant author, read-only user and other-tenant user have explicit positive/negative permission tests; authoritative checks remain server-side.
- [ ] Publish a fixed shared package and verify exact resolved consumer lockfiles where consumed; sweep local copies before claiming the class closed.
- [ ] On deployed d.* UI, create from the real New workflow control, save/reload, publish/activate and run a safe test process. Record deployed SHA, successful row/version IDs and one failure/retry trace. Product closure requires approved real-use evidence.

## Documentation requirement — operator clarification, September 8

Read and update `docs/20260908-customization-capability-register-v1.00W.md` and `docs/plans/20260908-estate-remediation-plan-v1.00W.md` in the parent BSuite repository, following their links to existing specifications. Document the visual controls, canonical data/permissions, workflow connections, version/save behavior, examples and verification evidence for every capability changed. Improve the existing applicable plan/specification in the same delivery; do not leave contradictory active guidance or create an unlinked parallel plan. Dated audit findings remain historical and receive explicit supersession notes.
